import type { GameAction } from '../shared/actions.ts';
import type { ChatEvent } from '../shared/dialogue.ts';
import { type Catalogue, carName, findCar, findPart, partName } from '../src/data/catalogue.ts';
import { ObjectiveType, type Persona, ToolName } from '../src/data/schema.ts';
import { applyAction, currentPrice, labourQuote, tradeInValue } from '../src/rpg/actions.ts';
import { describeObjective, NITROUS_SHOT_USD, usd } from '../src/rpg/economy.ts';
import type { GameState } from '../src/save/schema.ts';

/**
 * Server-side action validator. The model proposes; this decides.
 * Every tool call is checked against the persona's allowed tools and dry-run
 * through the same reducer the client uses. The result is reported back to
 * the model so the character can react to it in voice.
 */

export interface ToolOutcome {
  events: ChatEvent[];
  /** Reported back to the model. */
  output: Record<string, unknown>;
  /** Working state for later tool calls in the same reply. */
  state: GameState;
}

const reject = (state: GameState, tool: string, reason: string): ToolOutcome => ({
  events: [{ type: 'rejected', tool, reason }],
  output: { accepted: false, reason },
  state,
});

function parseArgs(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function handleToolCall(
  persona: Persona,
  name: string,
  rawArgs: string,
  state: GameState,
  cat: Catalogue,
): ToolOutcome {
  const tool = ToolName.safeParse(name);
  if (!tool.success || !persona.tools.includes(tool.data))
    return reject(state, name, `${persona.name} cannot do that.`);
  const args = parseArgs(rawArgs);
  if (!args) return reject(state, name, 'Could not read the request.');
  const str = (k: string) => (typeof args[k] === 'string' ? (args[k] as string) : '');
  const num = (k: string) => (typeof args[k] === 'number' ? (args[k] as number) : NaN);

  const dryRun = (action: GameAction) => applyAction(state, action, cat);

  switch (tool.data) {
    case 'give_tip': {
      const tip = str('tip').slice(0, 300);
      if (!tip) return reject(state, name, 'Empty tip.');
      return {
        events: [{ type: 'tip', topic: str('topic').slice(0, 60) || 'Tip', tip }],
        output: { accepted: true },
        state,
      };
    }

    case 'quote_part': {
      const part = findPart(cat, str('part_id'));
      if (!part || !part.fits.includes(state.carId))
        return reject(state, name, 'That part is not on the shelves for this car.');
      return {
        events: [{ type: 'quote', partId: part.id }],
        output: {
          accepted: true,
          part: partName(part),
          part_number: part.part_number,
          price_usd: currentPrice(state, part),
        },
        state,
      };
    }

    case 'offer_discount': {
      const action: GameAction = {
        type: 'offerDiscount',
        characterId: persona.id,
        partId: str('part_id'),
        priceUsd: num('price_usd'),
      };
      if (!Number.isFinite(action.priceUsd)) return reject(state, name, 'No price given.');
      const r = dryRun(action);
      if (!r.ok) return reject(state, name, r.error.message);
      const part = findPart(cat, action.partId)!;
      const label = `${partName(part)} offered at ${usd(r.state.offers.discounts[part.id]!.priceUsd)} (list ${usd(part.price_usd)})`;
      return {
        events: [{ type: 'applied', action, label }],
        output: { accepted: true, price_usd: r.state.offers.discounts[part.id]!.priceUsd },
        state: r.state,
      };
    }

    case 'sell_part': {
      const part = findPart(cat, str('part_id'));
      if (!part) return reject(state, name, 'That part is not in the catalogue.');
      const action: GameAction = {
        type: 'buyPart',
        partId: part.id,
        priceUsd: currentPrice(state, part),
      };
      const r = dryRun(action);
      if (!r.ok) return reject(state, name, r.error.message);
      return {
        events: [
          { type: 'proposal', action, label: `Buy ${partName(part)} for ${usd(action.priceUsd)}` },
        ],
        output: {
          accepted: true,
          status: 'on the counter, waiting for the player to confirm',
          price_usd: action.priceUsd,
        },
        state,
      };
    }

    case 'install_part': {
      const part = findPart(cat, str('part_id'));
      if (!part) return reject(state, name, 'That part is not in the catalogue.');
      const action: GameAction = { type: 'installPart', partId: part.id };
      const r = dryRun(action);
      if (!r.ok) return reject(state, name, r.error.message);
      const labour = labourQuote(cat, state, part);
      return {
        events: [
          { type: 'proposal', action, label: `Fit ${partName(part)} (labour ${usd(labour)})` },
        ],
        output: {
          accepted: true,
          status: 'waiting for the player to confirm the labour charge',
          labour_usd: labour,
        },
        state,
      };
    }

    case 'offer_sponsorship': {
      const objective = ObjectiveType.safeParse(str('objective'));
      if (!objective.success) return reject(state, name, 'Unknown objective.');
      const speed = num('top_speed_kmh');
      const action: GameAction = {
        type: 'offerSponsorship',
        characterId: persona.id,
        objective: {
          type: objective.data,
          ...(objective.data === 'topSpeed' && Number.isFinite(speed)
            ? { value: Math.round(speed) }
            : {}),
        },
        payoutUsd: num('payout_usd'),
      };
      if (!Number.isFinite(action.payoutUsd)) return reject(state, name, 'No payout given.');
      const r = dryRun(action);
      if (!r.ok) return reject(state, name, r.error.message);
      const offer = r.state.offers.sponsor!;
      return {
        events: [
          {
            type: 'applied',
            action,
            label: `${describeObjective(offer.objective)}: ${usd(offer.payoutUsd)} per race, ${offer.races} races`,
          },
        ],
        output: {
          accepted: true,
          status: 'deal card shown to the player; they accept or decline on screen',
        },
        state: r.state,
      };
    }

    case 'sell_car': {
      const car = findCar(cat, str('car_id'));
      if (!car) return reject(state, name, 'That car is not on the lot.');
      const action: GameAction = { type: 'buyCar', carId: car.id };
      const r = dryRun(action);
      if (!r.ok) return reject(state, name, r.error.message);
      const cost = car.price_usd - tradeInValue(cat, state);
      return {
        events: [
          {
            type: 'proposal',
            action,
            label: `Trade up to the ${carName(car)} for ${usd(cost)} after trade-in`,
          },
        ],
        output: { accepted: true, status: 'waiting for the player to confirm', pay_usd: cost },
        state,
      };
    }

    case 'sell_nitrous': {
      const shots = Math.round(num('shots'));
      if (!Number.isFinite(shots)) return reject(state, name, 'How many shots?');
      const action: GameAction = { type: 'buyNitrous', shots };
      const r = dryRun(action);
      if (!r.ok) return reject(state, name, r.error.message);
      return {
        events: [
          {
            type: 'proposal',
            action,
            label: `Buy ${shots} nitrous ${shots === 1 ? 'shot' : 'shots'} for ${usd(shots * NITROUS_SHOT_USD)}`,
          },
        ],
        output: {
          accepted: true,
          status: 'waiting for the player to confirm',
          price_usd: shots * NITROUS_SHOT_USD,
        },
        state,
      };
    }

    case 'adjust_relationship': {
      const delta = Math.round(num('delta'));
      if (!Number.isFinite(delta) || delta === 0) return reject(state, name, 'No change.');
      const action: GameAction = { type: 'adjustRelationship', characterId: persona.id, delta };
      const r = dryRun(action);
      if (!r.ok) return reject(state, name, r.error.message);
      return {
        events: [
          {
            type: 'applied',
            action,
            label:
              delta > 0
                ? `${persona.name} likes you a bit more`
                : `${persona.name} is a bit annoyed with you`,
          },
        ],
        output: { accepted: true },
        state: r.state,
      };
    }
  }
}

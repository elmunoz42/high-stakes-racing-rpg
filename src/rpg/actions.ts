import type { ActionError, ActionErrorCode, GameAction } from '../../shared/actions.ts';
import {
  type Catalogue,
  characterByRole,
  findCar,
  findCharacter,
  findPart,
  findSponsor,
} from '../data/catalogue.ts';
import type { Part } from '../data/schema.ts';
import { type GameState, type RaceRecord, SAVE_VERSION } from '../save/schema.ts';
import {
  CAREER_FUND_USD,
  DEFAULT_DISCOUNT_FLOOR,
  RELATIONSHIP_MAX,
  RELATIONSHIP_MIN,
  RELATIONSHIP_STEP_MAX,
  labourFor,
  objectiveMet,
  prizeFor,
} from './economy.ts';

export type ActionResult =
  { ok: true; state: GameState; note?: string } | { ok: false; error: ActionError };

const fail = (code: ActionErrorCode, message: string): ActionResult => ({
  ok: false,
  error: { code, message },
});

const cents = (n: number) => Math.round(n * 100) / 100;

export function createCareer(
  cat: Catalogue,
  carId: string,
  seed: number,
  location = 'harbour-district',
): GameState {
  const car = findCar(cat, carId);
  if (!car) throw new Error(`Unknown car: ${carId}`);
  if (car.price_usd > CAREER_FUND_USD) throw new Error(`${carId} costs more than the career fund`);
  return {
    version: SAVE_VERSION,
    seed,
    money: CAREER_FUND_USD - car.price_usd,
    carId,
    inventory: [],
    installed: {},
    sponsor: null,
    offers: { discounts: {}, sponsor: null },
    relationships: Object.fromEntries(cat.characters.map((c) => [c.id, 0])),
    memories: {},
    lastRace: null,
    raceCount: 0,
    location,
  };
}

/** Price the player pays for a part right now: an active haggled offer, else list. */
export function currentPrice(state: GameState, part: Part): number {
  return state.offers.discounts[part.id]?.priceUsd ?? part.price_usd;
}

export function discountFloorPrice(cat: Catalogue, part: Part, characterId: string): number {
  const floor = findCharacter(cat, characterId)?.discountFloor ?? DEFAULT_DISCOUNT_FLOOR;
  return Math.ceil(part.price_usd * floor * 100) / 100;
}

export function owns(state: GameState, partId: string): boolean {
  return state.inventory.includes(partId) || Object.values(state.installed).includes(partId);
}

export function installedParts(cat: Catalogue, state: GameState): Part[] {
  return Object.values(state.installed)
    .map((id) => (id ? findPart(cat, id) : undefined))
    .filter((p): p is Part => !!p);
}

export function labourQuote(cat: Catalogue, state: GameState, part: Part): number {
  const mechanic = characterByRole(cat, 'mechanic');
  return labourFor(part.category, mechanic ? (state.relationships[mechanic.id] ?? 0) : 0);
}

/**
 * Pure reducer. Validates first; never mutates its input.
 * Used for real changes on the client and as a dry run on the server.
 */
export function applyAction(state: GameState, action: GameAction, cat: Catalogue): ActionResult {
  const s: GameState = structuredClone(state);

  switch (action.type) {
    case 'buyPart': {
      const part = findPart(cat, action.partId);
      if (!part) return fail('unknown_part', `No part with id ${action.partId} in the catalogue.`);
      if (!part.fits.includes(s.carId))
        return fail('does_not_fit', `${part.name} does not fit this car.`);
      if (owns(s, part.id)) return fail('already_owned', `Player already owns ${part.name}.`);
      const price = currentPrice(s, part);
      if (Math.abs(action.priceUsd - price) > 0.005)
        return fail(
          'price_mismatch',
          `Price for ${part.name} is ${price}, not ${action.priceUsd}.`,
        );
      if (s.money < price)
        return fail('insufficient_funds', `Player has ${s.money}, needs ${price}.`);
      s.money = cents(s.money - price);
      s.inventory.push(part.id);
      delete s.offers.discounts[part.id];
      return { ok: true, state: s };
    }

    case 'installPart': {
      const part = findPart(cat, action.partId);
      if (!part) return fail('unknown_part', `No part with id ${action.partId} in the catalogue.`);
      if (!s.inventory.includes(part.id))
        return fail('not_owned', `Player does not have ${part.name} waiting to be fitted.`);
      if (!part.fits.includes(s.carId))
        return fail('does_not_fit', `${part.name} does not fit this car.`);
      const labour = labourQuote(cat, s, part);
      if (s.money < labour)
        return fail('insufficient_funds', `Labour is ${labour}; player has ${s.money}.`);
      const previous = s.installed[part.category];
      s.inventory = s.inventory.filter((id) => id !== part.id);
      if (previous) s.inventory.push(previous);
      s.installed[part.category] = part.id;
      s.money = cents(s.money - labour);
      return { ok: true, state: s, note: previous ? `replaced ${previous}` : undefined };
    }

    case 'offerDiscount': {
      const who = findCharacter(cat, action.characterId);
      if (!who) return fail('unknown_character', `Unknown character ${action.characterId}.`);
      if (!who.tools.includes('offer_discount'))
        return fail('not_allowed', `${who.name} cannot discount parts.`);
      const part = findPart(cat, action.partId);
      if (!part) return fail('unknown_part', `No part with id ${action.partId} in the catalogue.`);
      if (!part.fits.includes(s.carId))
        return fail('does_not_fit', `${part.name} does not fit this car.`);
      if (owns(s, part.id)) return fail('already_owned', `Player already owns ${part.name}.`);
      const price = cents(action.priceUsd);
      if (price > part.price_usd) return fail('invalid', `A discount cannot be above list price.`);
      const floor = discountFloorPrice(cat, part, who.id);
      if (price < floor)
        return fail(
          'below_floor',
          `${price} is below ${who.name}'s floor of ${floor} for ${part.name}.`,
        );
      s.offers.discounts[part.id] = { characterId: who.id, priceUsd: price };
      return { ok: true, state: s };
    }

    case 'offerSponsorship': {
      const who = findCharacter(cat, action.characterId);
      if (!who) return fail('unknown_character', `Unknown character ${action.characterId}.`);
      if (!who.tools.includes('offer_sponsorship') || !who.sponsorId)
        return fail('not_allowed', `${who.name} cannot offer sponsorship.`);
      const sponsor = findSponsor(cat, who.sponsorId);
      if (!sponsor) return fail('invalid', `Unknown sponsor ${who.sponsorId}.`);
      if (s.sponsor) return fail('already_sponsored', 'Player already has an active sponsor deal.');
      if (!sponsor.objectives.includes(action.objective.type))
        return fail(
          'objective_not_offered',
          `${sponsor.name} does not pay for ${action.objective.type}.`,
        );
      if (action.objective.type === 'topSpeed') {
        const v = action.objective.value;
        if (v === undefined || v < 100 || v > 300)
          return fail('invalid', 'A top speed objective needs a value between 100 and 300 km/h.');
      }
      if (action.payoutUsd < sponsor.minPayoutUsd || action.payoutUsd > sponsor.maxPayoutUsd)
        return fail(
          'payout_out_of_range',
          `${sponsor.name} pays between ${sponsor.minPayoutUsd} and ${sponsor.maxPayoutUsd} per race.`,
        );
      s.offers.sponsor = {
        sponsorId: sponsor.id,
        characterId: who.id,
        objective: action.objective,
        payoutUsd: Math.round(action.payoutUsd),
        races: sponsor.races,
      };
      return { ok: true, state: s };
    }

    case 'acceptSponsorship': {
      const offer = s.offers.sponsor;
      if (!offer) return fail('no_offer', 'There is no sponsorship offer on the table.');
      if (s.sponsor) return fail('already_sponsored', 'Player already has an active sponsor deal.');
      s.sponsor = { ...offer, racesLeft: offer.races, earnedUsd: 0 };
      s.offers.sponsor = null;
      return { ok: true, state: s };
    }

    case 'declineSponsorship': {
      if (!s.offers.sponsor) return fail('no_offer', 'There is no sponsorship offer on the table.');
      s.offers.sponsor = null;
      return { ok: true, state: s };
    }

    case 'adjustRelationship': {
      if (!findCharacter(cat, action.characterId))
        return fail('unknown_character', `Unknown character ${action.characterId}.`);
      if (Math.abs(action.delta) > RELATIONSHIP_STEP_MAX)
        return fail(
          'invalid',
          `Relationship can change by at most ${RELATIONSHIP_STEP_MAX} at a time.`,
        );
      const now = s.relationships[action.characterId] ?? 0;
      s.relationships[action.characterId] = Math.max(
        RELATIONSHIP_MIN,
        Math.min(RELATIONSHIP_MAX, now + action.delta),
      );
      return { ok: true, state: s };
    }

    case 'setMemory': {
      if (!findCharacter(cat, action.characterId))
        return fail('unknown_character', `Unknown character ${action.characterId}.`);
      s.memories[action.characterId] = action.summary.trim();
      return { ok: true, state: s };
    }

    case 'recordRace': {
      const r = action.result;
      const prize = prizeFor(r.position);
      let payout = 0;
      let met: boolean | null = null;
      const sponsorId = s.sponsor?.sponsorId ?? null;
      if (s.sponsor && s.sponsor.racesLeft > 0) {
        met = objectiveMet(s.sponsor.objective, r);
        if (met) payout = s.sponsor.payoutUsd;
        s.sponsor.racesLeft -= 1;
        s.sponsor.earnedUsd += payout;
      }
      s.money = cents(s.money + prize + payout);
      const record: RaceRecord = {
        ...r,
        prizeUsd: prize,
        sponsorPayoutUsd: payout,
        objectiveMet: met,
        sponsorId,
        balanceAfter: s.money,
      };
      s.lastRace = record;
      s.raceCount += 1;
      if (s.sponsor && s.sponsor.racesLeft === 0) s.sponsor = null;
      return { ok: true, state: s };
    }
  }
}

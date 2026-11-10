import type { ActionError, ActionErrorCode, GameAction } from '../../shared/actions.ts';
import {
  type Catalogue,
  characterByRole,
  findCar,
  findLocationIn,
  findCharacter,
  findPart,
  findSponsor,
} from '../data/catalogue.ts';
import type { Part } from '../data/schema.ts';
import { type GameState, type RaceRecord, SAVE_VERSION } from '../save/schema.ts';
import {
  CAREER_FUND_USD,
  DUEL_MIN_USD,
  duelCap,
  NITROUS_MAX_SHOTS,
  NITROUS_SHOT_USD,
  TRADE_IN_CAR,
  TRADE_IN_PARTS,
  UNLOCK_POSITION,
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
  location = cat.locations[0]?.id ?? 'harbour-district',
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
    nitrous: 0,
    bestFinish: {},
    duels: {},
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

/** What the dealer gives for the player's current car, fitted parts included. */
export function tradeInValue(cat: Catalogue, state: GameState): number {
  const car = findCar(cat, state.carId);
  const parts = installedParts(cat, state).reduce((sum, p) => sum + p.price_usd, 0);
  return Math.round((car?.price_usd ?? 0) * TRADE_IN_CAR + parts * TRADE_IN_PARTS);
}

/** A location is open if it is the first, or the player has a podium at the one before it. */
export function isUnlocked(cat: Catalogue, state: GameState, locationId: string): boolean {
  const loc = cat.locations.find((l) => l.id === locationId);
  if (!loc) return false;
  if (loc.tier <= 1) return true;
  const prev = cat.locations.find((l) => l.tier === loc.tier - 1);
  return !!prev && (state.bestFinish[prev.id] ?? 99) <= UNLOCK_POSITION;
}

/** The most a racer will wager at the player's current location. */
export function maxWager(cat: Catalogue, state: GameState): number {
  return Math.floor(
    Math.min(state.money, duelCap(findLocationIn(cat, state.location)?.prizeMult ?? 1)),
  );
}

function checkWager(
  cat: Catalogue,
  state: GameState,
  rivalId: string,
  wagerUsd: number,
): ActionResult | null {
  const who = findCharacter(cat, rivalId);
  if (!who) return fail('unknown_character', `Unknown racer ${rivalId}.`);
  if (who.role !== 'racer') return fail('not_allowed', `${who.name} does not race for money.`);
  const cap = duelCap(findLocationIn(cat, state.location)?.prizeMult ?? 1);
  if (wagerUsd < DUEL_MIN_USD || wagerUsd > cap)
    return fail('wager_out_of_range', `Wagers here run from ${DUEL_MIN_USD} to ${cap}.`);
  if (state.money < wagerUsd)
    return fail('insufficient_funds', `Player has ${state.money}, cannot cover ${wagerUsd}.`);
  return null;
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
      const here = findLocationIn(cat, s.location);
      const prize = prizeFor(r.position, here?.prizeMult ?? 1);
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
      s.nitrous = Math.max(0, s.nitrous - (r.nitrousUsed ?? 0));
      s.bestFinish[s.location] = Math.min(s.bestFinish[s.location] ?? 99, r.position);
      if (s.sponsor && s.sponsor.racesLeft === 0) s.sponsor = null;
      return { ok: true, state: s };
    }

    case 'buyCar': {
      const car = findCar(cat, action.carId);
      if (!car) return fail('unknown_car', `No car with id ${action.carId} on the lot.`);
      if (car.id === s.carId)
        return fail('already_owned', `Player already drives the ${car.model}.`);
      const cost = car.price_usd - tradeInValue(cat, s);
      if (s.money < cost)
        return fail(
          'insufficient_funds',
          `After trade-in the ${car.model} costs ${cost}; player has ${s.money}.`,
        );
      s.money = cents(s.money - cost);
      s.carId = car.id;
      s.installed = {}; // fitted parts go with the old car
      s.offers.discounts = {};
      return { ok: true, state: s };
    }

    case 'buyNitrous': {
      if (s.nitrous + action.shots > NITROUS_MAX_SHOTS)
        return fail(
          'full',
          `The car carries at most ${NITROUS_MAX_SHOTS} shots; it has ${s.nitrous}.`,
        );
      const cost = action.shots * NITROUS_SHOT_USD;
      if (s.money < cost)
        return fail(
          'insufficient_funds',
          `${action.shots} shots cost ${cost}; player has ${s.money}.`,
        );
      s.money = cents(s.money - cost);
      s.nitrous += action.shots;
      return { ok: true, state: s };
    }

    case 'travel': {
      const dest = cat.locations.find((l) => l.id === action.locationId);
      if (!dest) return fail('unknown_location', `No location ${action.locationId}.`);
      if (dest.id === s.location) return fail('invalid', `Player is already in ${dest.name}.`);
      if (!isUnlocked(cat, s, dest.id))
        return fail(
          'locked',
          `${dest.name} opens after a top ${UNLOCK_POSITION} finish at the location before it.`,
        );
      if (s.money < dest.travelCostUsd)
        return fail(
          'insufficient_funds',
          `Travel to ${dest.name} costs ${dest.travelCostUsd}; player has ${s.money}.`,
        );
      s.money = cents(s.money - dest.travelCostUsd);
      s.location = dest.id;
      return { ok: true, state: s };
    }

    case 'challenge': {
      return checkWager(cat, s, action.rivalId, action.wagerUsd) ?? { ok: true, state: s };
    }

    case 'recordDuel': {
      const bad = checkWager(cat, s, action.rivalId, action.wagerUsd);
      if (bad) return bad;
      const wager = Math.round(action.wagerUsd);
      s.money = cents(s.money + (action.won ? wager : -wager));
      const rec = s.duels[action.rivalId] ?? { wins: 0, losses: 0 };
      s.duels[action.rivalId] = action.won
        ? { ...rec, wins: rec.wins + 1 }
        : { ...rec, losses: rec.losses + 1 };
      // Racing someone for money earns a little respect either way.
      const rel = s.relationships[action.rivalId] ?? 0;
      s.relationships[action.rivalId] = Math.min(RELATIONSHIP_MAX, rel + 1);
      return { ok: true, state: s };
    }
  }
}

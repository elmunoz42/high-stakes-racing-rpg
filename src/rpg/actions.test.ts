import { describe, expect, it } from 'vitest';
import { TEST_CATALOGUE as cat } from '../../tests/unit/fixtures/catalogue.ts';
import type { GameAction } from '../../shared/actions.ts';
import type { GameState } from '../save/schema.ts';
import { applyAction, createCareer } from './actions.ts';
import { CAREER_FUND_USD, LABOUR_USD, prizeFor } from './economy.ts';
import type { RaceResult } from '../race/types.ts';

const start = (money?: number): GameState => {
  const s = createCareer(cat, 'alpha', 7);
  return money === undefined ? s : { ...s, money };
};

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce((s, a) => {
    const r = applyAction(s, a, cat);
    if (!r.ok) throw new Error(`${a.type}: ${r.error.code} ${r.error.message}`);
    return r.state;
  }, state);
}

function code(state: GameState, action: GameAction) {
  const r = applyAction(state, action, cat);
  return r.ok ? 'ok' : r.error.code;
}

const result = (position: number, extra: Partial<RaceResult> = {}): RaceResult => ({
  trackId: 't',
  laps: 3,
  position,
  timeMs: 200_000,
  collisions: 0,
  ledALap: false,
  topSpeedKmh: 180,
  order: [],
  ...extra,
});

describe('createCareer', () => {
  it('buys the car out of the career fund', () => {
    const s = start();
    expect(s.money).toBe(CAREER_FUND_USD - 9000);
    expect(s.carId).toBe('alpha');
    expect(s.relationships).toMatchObject({ coach: 0, mech: 0, seller: 0, rep: 0 });
  });
  it('refuses a car the fund cannot cover', () => {
    expect(() => createCareer(cat, 'beta', 1)).toThrow();
  });
});

describe('buyPart (US-004 AC4)', () => {
  it('charges list price and adds the part to inventory, not installed', () => {
    const s = run(start(), { type: 'buyPart', partId: 'tyre-a', priceUsd: 600 });
    expect(s.money).toBe(CAREER_FUND_USD - 9000 - 600);
    expect(s.inventory).toEqual(['tyre-a']);
    expect(s.installed).toEqual({});
  });
  it('rejects parts not in the catalogue', () => {
    expect(code(start(), { type: 'buyPart', partId: 'nope', priceUsd: 1 })).toBe('unknown_part');
  });
  it('rejects parts that do not fit', () => {
    expect(code(start(), { type: 'buyPart', partId: 'pads-z', priceUsd: 100 })).toBe(
      'does_not_fit',
    );
  });
  it('rejects purchases the player cannot afford', () => {
    expect(code(start(50), { type: 'buyPart', partId: 'pads-a', priceUsd: 100 })).toBe(
      'insufficient_funds',
    );
  });
  it('rejects a price that is not the list or offered price', () => {
    expect(code(start(), { type: 'buyPart', partId: 'pads-a', priceUsd: 10 })).toBe(
      'price_mismatch',
    );
  });
  it('rejects buying the same part twice', () => {
    const s = run(start(), { type: 'buyPart', partId: 'pads-a', priceUsd: 100 });
    expect(code(s, { type: 'buyPart', partId: 'pads-a', priceUsd: 100 })).toBe('already_owned');
  });
});

describe('offerDiscount (US-004 AC4)', () => {
  it('accepts a discount at or above the floor and the player can buy at it', () => {
    let s = run(start(), {
      type: 'offerDiscount',
      characterId: 'seller',
      partId: 'coil-a',
      priceUsd: 900,
    });
    expect(s.offers.discounts['coil-a']?.priceUsd).toBe(900);
    s = run(s, { type: 'buyPart', partId: 'coil-a', priceUsd: 900 });
    expect(s.offers.discounts['coil-a']).toBeUndefined();
    expect(s.inventory).toContain('coil-a');
  });
  it('rejects a discount below the seller floor', () => {
    expect(
      code(start(), {
        type: 'offerDiscount',
        characterId: 'seller',
        partId: 'coil-a',
        priceUsd: 849.99,
      }),
    ).toBe('below_floor');
    expect(
      code(start(), {
        type: 'offerDiscount',
        characterId: 'seller',
        partId: 'coil-a',
        priceUsd: 850,
      }),
    ).toBe('ok');
  });
  it('rejects discounts from characters who do not sell parts', () => {
    expect(
      code(start(), {
        type: 'offerDiscount',
        characterId: 'mech',
        partId: 'coil-a',
        priceUsd: 900,
      }),
    ).toBe('not_allowed');
  });
  it('rejects discounts on parts not in the catalogue', () => {
    expect(
      code(start(), { type: 'offerDiscount', characterId: 'seller', partId: 'ghost', priceUsd: 1 }),
    ).toBe('unknown_part');
  });
});

describe('installPart (US-005 AC3)', () => {
  it('moves an owned part onto the car and charges labour', () => {
    let s = run(start(), { type: 'buyPart', partId: 'coil-a', priceUsd: 1000 });
    const before = s.money;
    s = run(s, { type: 'installPart', partId: 'coil-a' });
    expect(s.installed.suspension).toBe('coil-a');
    expect(s.inventory).toEqual([]);
    expect(s.money).toBe(before - LABOUR_USD.suspension);
  });
  it('replaces the part in the same slot and returns the old one to inventory', () => {
    const s = run(
      start(),
      { type: 'buyPart', partId: 'coil-a', priceUsd: 1000 },
      { type: 'installPart', partId: 'coil-a' },
      { type: 'buyPart', partId: 'coil-b', priceUsd: 1200 },
      { type: 'installPart', partId: 'coil-b' },
    );
    expect(s.installed.suspension).toBe('coil-b');
    expect(s.inventory).toEqual(['coil-a']);
  });
  it('rejects installing a part the player does not have', () => {
    expect(code(start(), { type: 'installPart', partId: 'coil-a' })).toBe('not_owned');
  });
});

describe('sponsorship (US-006 AC3)', () => {
  const offer = (payoutUsd: number, type: 'top3' | 'win' = 'top3'): GameAction => ({
    type: 'offerSponsorship',
    characterId: 'rep',
    objective: { type },
    payoutUsd,
  });
  it('accepts a payout inside the sponsor range and the player can accept it', () => {
    const s = run(start(), offer(800), { type: 'acceptSponsorship' });
    expect(s.sponsor).toMatchObject({ sponsorId: 'fizz', payoutUsd: 800, racesLeft: 2 });
    expect(s.offers.sponsor).toBeNull();
  });
  it('rejects payouts outside the range', () => {
    expect(code(start(), offer(5000))).toBe('payout_out_of_range');
    expect(code(start(), offer(100))).toBe('payout_out_of_range');
  });
  it('rejects objectives the sponsor does not pay for', () => {
    expect(code(start(), offer(800, 'win'))).toBe('objective_not_offered');
  });
  it('rejects offers from characters who are not sponsors', () => {
    expect(
      code(start(), {
        type: 'offerSponsorship',
        characterId: 'coach',
        objective: { type: 'top3' },
        payoutUsd: 800,
      }),
    ).toBe('not_allowed');
  });
});

describe('recordRace (US-008 AC4)', () => {
  it('pays prize money by position', () => {
    const s = run(start(), { type: 'recordRace', result: result(2) });
    expect(s.lastRace?.prizeUsd).toBe(prizeFor(2));
    expect(s.money).toBe(CAREER_FUND_USD - 9000 + prizeFor(2));
    expect(s.raceCount).toBe(1);
  });
  it('pays the sponsor when the objective is met and not when it is missed', () => {
    let s = run(
      start(),
      { type: 'offerSponsorship', characterId: 'rep', objective: { type: 'top3' }, payoutUsd: 700 },
      { type: 'acceptSponsorship' },
    );
    s = run(s, { type: 'recordRace', result: result(2) });
    expect(s.lastRace).toMatchObject({ sponsorPayoutUsd: 700, objectiveMet: true });
    expect(s.sponsor?.racesLeft).toBe(1);
    s = run(s, { type: 'recordRace', result: result(5) });
    expect(s.lastRace).toMatchObject({ sponsorPayoutUsd: 0, objectiveMet: false });
    expect(s.sponsor).toBeNull();
  });
});

describe('relationships', () => {
  it('clamps changes to a small step', () => {
    expect(code(start(), { type: 'adjustRelationship', characterId: 'mech', delta: 5 })).toBe(
      'invalid',
    );
    expect(
      run(start(), { type: 'adjustRelationship', characterId: 'mech', delta: 2 }).relationships
        .mech,
    ).toBe(2);
  });
});

describe('purity', () => {
  it('never mutates the input state', () => {
    const s = start();
    const copy = structuredClone(s);
    applyAction(s, { type: 'buyPart', partId: 'tyre-a', priceUsd: 600 }, cat);
    expect(s).toEqual(copy);
  });
});

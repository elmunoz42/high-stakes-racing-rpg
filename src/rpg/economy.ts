import type { Slot } from '../data/schema.ts';
import type { Objective } from '../save/schema.ts';
import type { RaceResult } from '../race/types.ts';

/**
 * Game economy. All amounts are USD so real part prices mean something.
 * Tuned so the first upgrade is a real choice (see agent-os/product/game-design.md).
 */

/** Total career fund. The starter car is bought out of it; the rest is cash. */
export const CAREER_FUND_USD = 18_500;

/** Prize money by finishing position (index 0 = 1st). */
export const PRIZES_USD = [2_400, 1_500, 1_000, 650, 400, 250] as const;

export function prizeFor(position: number): number {
  return PRIZES_USD[position - 1] ?? 0;
}

/** Teo's labour, flat per slot. Invented shop rates. */
export const LABOUR_USD: Record<Slot, number> = {
  tyres: 80,
  suspension: 380,
  brakes: 120,
  intake: 60,
  exhaust: 160,
};

/** Teo knocks this much off labour for friends (relationship >= LABOUR_FRIEND_LEVEL). */
export const LABOUR_FRIEND_DISCOUNT = 0.2;
export const LABOUR_FRIEND_LEVEL = 3;

export function labourFor(slot: Slot, mechanicRelationship: number): number {
  const base = LABOUR_USD[slot];
  return mechanicRelationship >= LABOUR_FRIEND_LEVEL
    ? Math.round(base * (1 - LABOUR_FRIEND_DISCOUNT))
    : base;
}

export const RELATIONSHIP_MIN = -10;
export const RELATIONSHIP_MAX = 10;
/** Largest change a single conversation action may make. */
export const RELATIONSHIP_STEP_MAX = 2;

/** Default haggle floor if a seller does not define one: 15% off list. */
export const DEFAULT_DISCOUNT_FLOOR = 0.85;

export function objectiveMet(objective: Objective, result: RaceResult): boolean {
  switch (objective.type) {
    case 'win':
      return result.position === 1;
    case 'top3':
      return result.position <= 3;
    case 'clean':
      return result.collisions === 0;
    case 'topSpeed':
      return result.topSpeedKmh >= (objective.value ?? Infinity);
  }
}

export function describeObjective(objective: Objective): string {
  switch (objective.type) {
    case 'win':
      return 'Win the race';
    case 'top3':
      return 'Finish in the top 3';
    case 'clean':
      return 'Finish without touching another car';
    case 'topSpeed':
      return `Hit ${objective.value ?? '?'} km/h at any point`;
  }
}

export const usd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

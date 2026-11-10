import type { Car, Part, Slot, Tier } from '../data/schema.ts';

/**
 * Car stats the race reads. Power and weight come from the car's sourced
 * figures. Grip, braking, aero and reliability are game ratings (1.0 = a
 * stock car on its factory tyres) that parts change by the rules below.
 */
export interface CarStats {
  power_hp: number;
  weight_kg: number;
  grip: number;
  braking: number;
  aero: number;
  reliability: number;
}

export interface PartEffects {
  powerPct?: number;
  weight_kg?: number;
  grip?: number;
  braking?: number;
  aero?: number;
  reliability?: number;
}

/**
 * Game-design rules: what a part of a given category and tier does.
 * These are deliberately simple and are not claims about real products.
 *  - tyres: stickier compounds add grip and shorten braking.
 *  - suspension: better body control adds grip; track setups cost a little reliability.
 *  - brakes: pad compound shortens braking.
 *  - intake / exhaust: small power gains; exhausts usually save a little weight.
 */
export const EFFECT_RULES: Record<Slot, Record<Tier, PartEffects>> = {
  tyres: {
    street: { grip: 0.05, braking: 0.03 },
    sport: { grip: 0.1, braking: 0.05 },
    track: { grip: 0.15, braking: 0.08, reliability: -0.02 },
  },
  suspension: {
    street: { grip: 0.04 },
    sport: { grip: 0.07, braking: 0.02 },
    track: { grip: 0.1, braking: 0.03, reliability: -0.04 },
  },
  brakes: {
    street: { braking: 0.06 },
    sport: { braking: 0.1 },
    track: { braking: 0.14, reliability: -0.02 },
  },
  intake: {
    street: { powerPct: 0.02 },
    sport: { powerPct: 0.03 },
    track: { powerPct: 0.04, reliability: -0.01 },
  },
  exhaust: {
    street: { powerPct: 0.03, weight_kg: -3 },
    sport: { powerPct: 0.05, weight_kg: -6 },
    track: { powerPct: 0.07, weight_kg: -9, reliability: -0.02 },
  },
};

export function partEffects(part: Pick<Part, 'category' | 'tier'>): PartEffects {
  return EFFECT_RULES[part.category][part.tier];
}

export function baseStats(car: Car): CarStats {
  return {
    power_hp: car.power_hp,
    weight_kg: car.weight_kg,
    grip: 1,
    braking: 1,
    aero: 1,
    reliability: 1,
  };
}

/** Stats for a car with the given parts installed (at most one per slot). */
export function carStats(car: Car, installed: readonly Part[]): CarStats {
  const s = baseStats(car);
  let powerPct = 0;
  for (const part of installed) {
    const e = partEffects(part);
    powerPct += e.powerPct ?? 0;
    s.weight_kg += e.weight_kg ?? 0;
    s.grip += e.grip ?? 0;
    s.braking += e.braking ?? 0;
    s.aero += e.aero ?? 0;
    s.reliability += e.reliability ?? 0;
  }
  s.power_hp = car.power_hp * (1 + powerPct);
  return round(s);
}

function round(s: CarStats): CarStats {
  const r = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
  return {
    power_hp: r(s.power_hp, 1),
    weight_kg: r(s.weight_kg, 1),
    grip: r(s.grip, 3),
    braking: r(s.braking, 3),
    aero: r(s.aero, 3),
    reliability: r(s.reliability, 3),
  };
}

/** Physical performance the race engine uses, derived from stats. SI units. */
export interface Performance {
  /** Top speed, m/s. Power-limited: drag power grows with v^3. */
  topSpeed: number;
  /** Launch acceleration, m/s^2, from power to weight. */
  accel: number;
  /** Braking deceleration, m/s^2. */
  brakeDecel: number;
  /** Lateral grip limit, m/s^2. */
  lateralGrip: number;
}

export function performance(s: CarStats): Performance {
  return {
    topSpeed: (37.5 * Math.cbrt(s.power_hp * s.aero)) / 3.6,
    accel: 1.0 + 27 * (s.power_hp / s.weight_kg),
    brakeDecel: 8.0 * s.braking,
    lateralGrip: 8.3 * s.grip,
  };
}

export const msToKmh = (v: number) => v * 3.6;

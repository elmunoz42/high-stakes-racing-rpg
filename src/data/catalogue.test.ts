import { describe, expect, it } from 'vitest';
import { CARS } from './cars.ts';
import { PARTS } from './parts.ts';
import { SPONSORS } from './sponsors.ts';
import { CarSchema, PartSchema, SponsorSchema } from './schema.ts';
import { CAREER_FUND_USD } from '../rpg/economy.ts';

const today = new Date().toISOString().slice(0, 10);

describe('car catalogue (US-001 AC3)', () => {
  it.each(CARS.map((c) => [c.id, c]))(
    '%s passes the schema with a source and check date',
    (_id, car) => {
      expect(() => CarSchema.parse(car)).not.toThrow();
      expect(car.source_url).toMatch(/^https:\/\//);
      expect(car.checked_on <= today).toBe(true);
    },
  );
  it('has exactly three starter cars the career fund can buy, and three to trade up to', () => {
    const starters = CARS.filter((c) => c.starter);
    expect(starters).toHaveLength(3);
    expect(CARS).toHaveLength(6);
    for (const car of starters) expect(car.price_usd).toBeLessThan(CAREER_FUND_USD);
  });
  it('has unique ids', () => {
    expect(new Set(CARS.map((c) => c.id)).size).toBe(CARS.length);
  });
});

describe('parts catalogue (US-004 AC5)', () => {
  const carIds = new Set(CARS.map((c) => c.id));
  it.each(PARTS.map((p) => [p.id, p]))(
    '%s passes the schema with source, price basis and check date',
    (_id, part) => {
      expect(() => PartSchema.parse(part)).not.toThrow();
      expect(part.checked_on <= today).toBe(true);
      expect(part.price_usd).toBeGreaterThan(0);
      for (const fit of part.fits) expect(carIds.has(fit)).toBe(true);
    },
  );
  it('has unique ids', () => {
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length);
  });
  it('gives every starter car parts in at least two categories', () => {
    for (const car of CARS.filter((c) => c.starter)) {
      const cats = new Set(PARTS.filter((p) => p.fits.includes(car.id)).map((p) => p.category));
      expect(cats.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('sponsors', () => {
  it.each(SPONSORS.map((s) => [s.id, s]))(
    '%s passes the schema with a sane payout range',
    (_id, s) => {
      expect(() => SponsorSchema.parse(s)).not.toThrow();
      expect(s.minPayoutUsd).toBeLessThan(s.maxPayoutUsd);
    },
  );
});

describe('characters and locations', async () => {
  const { CHARACTERS } = await import('./characters/index.ts');
  const { PersonaSchema } = await import('./schema.ts');
  const { LOCATIONS } = await import('./locations.ts');
  it.each(CHARACTERS.map((c) => [c.id, c]))('%s persona card passes the schema', (_id, c) => {
    expect(() => PersonaSchema.parse(c)).not.toThrow();
  });
  it('covers every role: the paddock four, a dealer, locals and racers', () => {
    expect(new Set(CHARACTERS.map((c) => c.role)).size).toBe(7);
  });
  it('every building character exists', () => {
    for (const l of LOCATIONS)
      for (const b of l.buildings)
        if (b.characterId) expect(CHARACTERS.some((c) => c.id === b.characterId)).toBe(true);
  });
  it('has six tiered locations whose tracks and rival cars exist', async () => {
    const { TRACKS } = await import('../race/tracks.ts');
    expect(LOCATIONS.map((l) => l.tier)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const l of LOCATIONS) {
      expect(TRACKS.some((t) => t.id === l.trackId)).toBe(true);
      for (const id of l.rivalCars) expect(CARS.some((c) => c.id === id)).toBe(true);
      expect(l.buildings.some((b) => b.kind === 'gate')).toBe(true);
      expect(l.buildings.some((b) => b.kind === 'travel')).toBe(true);
    }
  });
  it('US-015 AC3: every location has a bar with all six racers, and every racer has a persona card', async () => {
    const { RACERS } = await import('./rivals.ts');
    for (const l of LOCATIONS) {
      const bar = l.buildings.find((b) => b.kind === 'bar');
      expect(bar, l.id).toBeTruthy();
      expect(bar!.characterIds).toEqual(RACERS.map((r) => r.id));
    }
    for (const r of RACERS) {
      const persona = CHARACTERS.find((c) => c.id === r.id);
      expect(persona?.role, r.id).toBe('racer');
      expect(persona?.name).toBe(r.name);
    }
  });
});

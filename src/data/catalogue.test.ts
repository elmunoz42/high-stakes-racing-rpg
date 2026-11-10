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
  it('has exactly three starter cars the career fund can buy', () => {
    expect(CARS).toHaveLength(3);
    for (const car of CARS) expect(car.price_usd).toBeLessThan(CAREER_FUND_USD);
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
    for (const car of CARS) {
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

import { describe, expect, it } from 'vitest';
import { TEST_CATALOGUE as cat } from '../../tests/unit/fixtures/catalogue.ts';
import { carStats, performance } from './carStats.ts';

const alpha = cat.cars[0]!;
const p = (id: string) => cat.parts.find((x) => x.id === id)!;

describe('carStats', () => {
  it('applies each installed part once', () => {
    const stock = carStats(alpha, []);
    const tyres = carStats(alpha, [p('tyre-a')]);
    expect(tyres.grip).toBeGreaterThan(stock.grip);
    expect(carStats(alpha, [p('tyre-a'), p('coil-a')]).grip).toBeGreaterThan(tyres.grip);
  });
  it('more power means more top speed and acceleration', () => {
    const a = performance(carStats(alpha, []));
    const b = performance(carStats(cat.cars[1]!, []));
    expect(b.topSpeed).toBeGreaterThan(a.topSpeed);
    expect(b.accel).toBeGreaterThan(a.accel);
  });
});

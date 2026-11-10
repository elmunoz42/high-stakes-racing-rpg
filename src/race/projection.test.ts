import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue.ts';
import { baseStats } from '../rpg/carStats.ts';
import { createRace } from './field.ts';
import { buildDrawList, SCREEN_H, SCREEN_W } from './projection.ts';
import { STEP } from './sim.ts';

describe('projection', () => {
  const car = CATALOGUE.cars[0]!;
  it('draws road quads inside the screen and the player car last', () => {
    const sim = createRace(CATALOGUE, car.id, baseStats(car), 3);
    sim.started = true;
    for (let i = 0; i < 600; i++) sim.step({ steer: 0, throttle: 1, brake: 0 });
    const list = buildDrawList(sim);
    expect(list.quads.length).toBeGreaterThan(50);
    for (const q of list.quads) {
      expect(q.y1).toBeGreaterThanOrEqual(q.y2);
      expect(q.y2).toBeLessThanOrEqual(SCREEN_H);
    }
    const last = list.sprites.at(-1)!;
    expect(last.car?.isPlayer).toBe(true);
    expect(last.x).toBeGreaterThan(0);
    expect(last.x).toBeLessThan(SCREEN_W);
    expect(last.y).toBeGreaterThan(SCREEN_H * 0.6);
  });

  it('shows rival cars ahead on the grid', () => {
    const sim = createRace(CATALOGUE, car.id, baseStats(car), 3);
    const list = buildDrawList(sim);
    expect(list.sprites.filter((s) => s.car && !s.car.isPlayer).length).toBeGreaterThanOrEqual(3);
    expect(STEP).toBeCloseTo(1 / 60);
  });
});

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

  it('fades the far ground fully into the haze with no stripe contrast (horizon flicker fix)', async () => {
    const { HAZE, HORIZON_Y } = await import('./projection.ts');
    // Flat and straight, so the top rows of ground really are the farthest segments.
    const { RaceSim } = await import('./sim.ts');
    const { buildTrack } = await import('./track.ts');
    const { performance } = await import('../rpg/carStats.ts');
    const flat = buildTrack({
      id: 'f',
      name: 'f',
      laps: 1,
      sections: [{ length: 4000, curve: 0, hill: 0, scenery: 'harbour' }],
    });
    const sim = new RaceSim({
      track: flat,
      laps: 1,
      seed: 1,
      entrants: [
        {
          id: 'p',
          name: 'p',
          carName: 'x',
          isPlayer: true,
          perf: performance(baseStats(car)),
          pace: 1,
          color: '#ffffff',
          body: 'coupe',
        },
      ],
    });
    sim.cars[0]!.z = 500;
    const list = buildDrawList(sim);
    // A haze band covers the seam at the horizon.
    expect(list.quads[0]).toMatchObject({ color: HAZE, y1: SCREEN_H });
    expect(list.quads[0]!.y2).toBeLessThan(HORIZON_Y);
    // Everything drawn in the top rows of the ground is exactly the haze colour.
    const top = Math.min(...list.quads.slice(1).map((q) => q.y2));
    const far = list.quads.slice(1).filter((q) => q.y2 <= top + 1);
    expect(far.length).toBeGreaterThan(0);
    for (const q of far) expect(q.color).toBe(HAZE);
    // Quads sit on whole pixel rows.
    for (const q of list.quads) expect(Number.isInteger(q.y1) && Number.isInteger(q.y2)).toBe(true);
  });
});

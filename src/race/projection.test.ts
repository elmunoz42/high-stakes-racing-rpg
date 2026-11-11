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

  it('fills the horizon with the far ground colour, not a band of haze (horizon fix)', async () => {
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
    // The backing behind the ground starts above the horizon and is coloured
    // like the farthest ground on each side, so no strip of another colour shows.
    const [bl, br] = list.quads as [(typeof list.quads)[0], (typeof list.quads)[0]];
    expect(bl.y2).toBeLessThan(HORIZON_Y);
    const top = Math.min(...list.quads.slice(2).map((q) => q.y2));
    const farthest = list.quads.slice(2).filter((q) => q.y2 === top);
    expect(farthest[0]!.color).toBe(bl.color);
    expect(farthest[1]!.color).toBe(br.color);
    // And that colour is still the ground's own (sand on the right), not the haze.
    const dist = (a: number, b: number) =>
      Math.abs(((a >> 16) & 255) - ((b >> 16) & 255)) +
      Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) +
      Math.abs((a & 255) - (b & 255));
    expect(dist(br.color, 0xc7b189)).toBeLessThan(dist(br.color, HAZE));
    // Quads sit on whole pixel rows.
    for (const q of list.quads) expect(Number.isInteger(q.y1) && Number.isInteger(q.y2)).toBe(true);
  });
});

describe('projection over crests', () => {
  it('never draws a far strip over rows a nearer strip already covers', async () => {
    const { RaceSim } = await import('./sim.ts');
    const { buildTrack } = await import('./track.ts');
    const { performance } = await import('../rpg/carStats.ts');
    // A rise then a drop: the classic crest.
    const hill = buildTrack({
      id: 'h',
      name: 'h',
      laps: 1,
      sections: [
        { length: 200, curve: 0, hill: 0, scenery: 'harbour' },
        { length: 160, curve: 2, hill: 12, scenery: 'harbour' },
        { length: 300, curve: 0, hill: -18, scenery: 'harbour' },
        { length: 400, curve: 0, hill: 6, scenery: 'harbour' },
      ],
    });
    const car = CATALOGUE.cars[0]!;
    const perf = performance(baseStats(car));
    for (let z = 0; z <= 400; z += 7) {
      const sim = new RaceSim({
        track: hill,
        laps: 1,
        seed: 1,
        entrants: [
          {
            id: 'p',
            name: 'p',
            carName: 'x',
            isPlayer: true,
            perf,
            pace: 1,
            color: '#ffffff',
            body: 'coupe',
          },
        ],
      });
      sim.cars[0]!.z = z;
      const list = buildDrawList(sim);
      // No strip may reach below the top of any strip from a nearer segment.
      let nearerTop = Infinity;
      let current = -1;
      let currentTop = Infinity;
      for (const q of list.quads.slice(2)) {
        if (q.seg !== current) {
          nearerTop = Math.min(nearerTop, currentTop);
          current = q.seg ?? -1;
          currentTop = Infinity;
        }
        expect(q.y1, `z=${z} segment ${q.seg}`).toBeLessThanOrEqual(nearerTop);
        currentTop = Math.min(currentTop, q.y2);
      }
    }
  });

  it('never emits a collapsed ground strip, even when the road ahead curves off screen', async () => {
    const { RaceSim } = await import('./sim.ts');
    const { buildTrack } = await import('./track.ts');
    const { performance } = await import('../rpg/carStats.ts');
    const car = CATALOGUE.cars[0]!;
    for (const curve of [8, -8]) {
      const bend = buildTrack({
        id: 'b',
        name: 'b',
        laps: 1,
        sections: [
          { length: 100, curve: 0, hill: 0, scenery: 'harbour' },
          { length: 600, curve, hill: 0, scenery: 'harbour' },
        ],
      });
      const sim = new RaceSim({
        track: bend,
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
      sim.cars[0]!.z = 40;
      const list = buildDrawList(sim);
      // The two ground strips of every segment (first two quads per segment).
      const bySeg = new Map<number, typeof list.quads>();
      for (const q of list.quads.slice(2)) bySeg.set(q.seg!, [...(bySeg.get(q.seg!) ?? []), q]);
      for (const [seg, qs] of bySeg) {
        // Neither strip may collapse: a zero-width end is a shape the filler skips.
        for (const q of qs.slice(0, 2)) {
          expect(q.w1, `curve ${curve} seg ${seg} bottom`).toBeGreaterThan(0.5);
          expect(q.w2, `curve ${curve} seg ${seg} top`).toBeGreaterThan(0.5);
        }
        // Together they span the whole screen width at both ends.
        const [l, r] = qs as [(typeof qs)[0], (typeof qs)[0]];
        expect(l.x1 - l.w1).toBeLessThanOrEqual(0);
        expect(l.x2 - l.w2).toBeLessThanOrEqual(0);
        expect(r.x1 + r.w1).toBeGreaterThanOrEqual(SCREEN_W);
        expect(r.x2 + r.w2).toBeGreaterThanOrEqual(SCREEN_W);
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue.ts';
import { baseStats, carStats, performance, type CarStats } from '../rpg/carStats.ts';
import { createRace } from './field.ts';
import { RaceSim, STEP, type Entrant } from './sim.ts';
import { buildTrack, HARBOUR_LOOP, type TrackDef } from './track.ts';

const miata = CATALOGUE.cars.find((c) => c.id === 'mx5-na-1994')!;
const stock = baseStats(miata);

function solo(def: TrackDef, stats: CarStats, seconds: number) {
  const entrant: Entrant = {
    id: 'p',
    name: 'P',
    carName: 'x',
    isPlayer: true,
    perf: performance(stats),
    pace: 1,
    color: '#ffffff',
    body: 'roadster',
  };
  const sim = new RaceSim({ track: buildTrack(def), laps: 1, entrants: [entrant], seed: 1 });
  sim.setPlayerAutopilot(true);
  sim.started = true;
  for (let t = 0; t < seconds && !sim.playerFinished; t += STEP) sim.step();
  return sim;
}

describe('race simulation', () => {
  it('produces the same result for the same seed and inputs (US-007 AC4)', () => {
    const run = () => {
      const sim = createRace(CATALOGUE, miata.id, stock, 42);
      sim.setPlayerAutopilot(true);
      return sim.runToFinish();
    };
    expect(run()).toEqual(run());
  });

  it('gives different races for different seeds', () => {
    const r = (seed: number) => {
      const sim = createRace(CATALOGUE, miata.id, stock, seed);
      sim.setPlayerAutopilot(true);
      return sim.runToFinish().order.map((o) => o.timeMs);
    };
    expect(r(1)).not.toEqual(r(2));
  });

  it('a car with more power reaches a higher top speed (US-007 AC5)', () => {
    const straight: TrackDef = {
      id: 's',
      name: 's',
      laps: 1,
      sections: [{ length: 3000, curve: 0, hill: 0 }],
    };
    const weak = solo(straight, stock, 60).player!.topSpeed;
    const strong = solo(straight, { ...stock, power_hp: stock.power_hp * 1.3 }, 60).player!
      .topSpeed;
    expect(strong).toBeGreaterThan(weak + 1);
  });

  it('a car with more grip takes a corner faster (US-007 AC5)', () => {
    const corner: TrackDef = {
      id: 'c',
      name: 'c',
      laps: 1,
      sections: [
        { length: 60, curve: 0, hill: 0 },
        { length: 400, curve: 12, hill: 0 },
        { length: 40, curve: 0, hill: 0 },
      ],
    };
    const t = (stats: CarStats) => solo(corner, stats, 120).player!.finishTime;
    const base = t(stock);
    const grippy = t({ ...stock, grip: stock.grip + 0.15 });
    expect(grippy).toBeLessThan(base - 0.3);
  });

  it('upgrading parts makes the car quicker over a lap', () => {
    const parts = ['michelin-pe2-185-60r14', 'blox-ss2-bxss-02905'].map((id) =>
      CATALOGUE.parts.find((p) => p.id === id)!,
    );
    const lap = (stats: CarStats) => solo(HARBOUR_LOOP, stats, 300).player!.finishTime;
    expect(lap(carStats(miata, parts))).toBeLessThan(lap(stock));
  });

  it('finishes a full race with six classified cars and a sensible lap time', () => {
    const sim = createRace(CATALOGUE, miata.id, stock, 7);
    sim.setPlayerAutopilot(true);
    const result = sim.runToFinish();
    expect(result.order).toHaveLength(6);
    expect(new Set(result.order.map((o) => o.position)).size).toBe(6);
    const lapSeconds = result.timeMs / 1000 / result.laps;
    expect(lapSeconds).toBeGreaterThan(55);
    expect(lapSeconds).toBeLessThan(110);
  });
});

describe('fastForward', () => {
  it('places the player where asked with rivals in a real order', async () => {
    const { fastForward } = await import('./fastForward.ts');
    for (const pos of [1, 3, 6]) {
      const r = fastForward(createRace(CATALOGUE, miata.id, stock, 5), pos);
      expect(r.position).toBe(pos);
      expect(r.order[pos - 1]!.isPlayer).toBe(true);
      const times = r.order.map((o) => o.timeMs);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
  });
});

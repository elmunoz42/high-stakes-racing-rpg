import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue.ts';
import { baseStats, performance } from '../rpg/carStats.ts';
import { createRace } from './field.ts';
import { RaceSim, STEP, type Drivetrain, type DriverInput, type Entrant } from './sim.ts';
import { buildTrack, ROAD_HALF_WIDTH, type TrackDef } from './track.ts';

const miata = CATALOGUE.cars.find((c) => c.id === 'mx5-na-1994')!;
const perf = performance(baseStats(miata));

const entrant = (id: string, isPlayer: boolean, drivetrain: Drivetrain = 'RWD'): Entrant => ({
  id,
  name: id,
  carName: 'x',
  isPlayer,
  perf,
  pace: 1,
  color: '#ffffff',
  body: 'roadster',
  drivetrain,
});

const STRAIGHT: TrackDef = {
  id: 's',
  name: 's',
  laps: 1,
  sections: [{ length: 6000, curve: 0, hill: 0 }],
};
const curve = (c: number): TrackDef => ({
  id: 'c',
  name: 'c',
  laps: 1,
  sections: [{ length: 6000, curve: c, hill: 0 }],
});

function sim(def: TrackDef, entrants: Entrant[]) {
  const s = new RaceSim({ track: buildTrack(def), laps: 1, entrants, seed: 1 });
  s.started = true;
  for (const c of s.cars) {
    c.z = 3000; // mid-section, well past the corner's ease-in
    c.x = 0;
    c.lane = 0;
  }
  return s;
}

function run(s: RaceSim, seconds: number, input: DriverInput, each?: () => void) {
  for (let t = 0; t < seconds; t += STEP) {
    s.step(input);
    each?.();
  }
}

describe('US-010 feel the limits', () => {
  it('AC2: too fast into a corner pushes the car wide and scrubs speed; a sensible speed holds the line', () => {
    const into = { steer: 1, throttle: 0, brake: 0 };
    const hot = sim(curve(14), [entrant('p', true)]);
    hot.player!.v = 48;
    let maxSlide = 0;
    run(hot, 1.5, into, () => (maxSlide = Math.max(maxSlide, hot.player!.slide)));
    expect(maxSlide).toBeGreaterThan(0.5);
    expect(hot.player!.x).toBeLessThan(-ROAD_HALF_WIDTH); // right-hander: pushed off to the left

    const coast = sim(STRAIGHT, [entrant('p', true)]);
    coast.player!.v = 48;
    run(coast, 1.5, { steer: 0, throttle: 0, brake: 0 });
    expect(hot.player!.v).toBeLessThan(coast.player!.v - 3);

    const calm = sim(curve(14), [entrant('p', true)]);
    calm.player!.v = 18;
    calm.setPlayerAutopilot(true);
    let wide = 0;
    run(calm, 3, into, () => (wide = Math.max(wide, Math.abs(calm.player!.x))));
    expect(wide).toBeLessThan(1.5);
    expect(calm.player!.slide).toBe(0);
  });

  it('AC1 (rule): the handbrake with steering makes the car slide and lose speed', () => {
    const s = sim(STRAIGHT, [entrant('p', true)]);
    s.player!.v = 35;
    run(s, 0.8, { steer: 1, throttle: 0, brake: 0, handbrake: true });
    expect(s.player!.slide).toBeGreaterThan(0.8);
    const free = sim(STRAIGHT, [entrant('p', true)]);
    free.player!.v = 35;
    run(free, 0.8, { steer: 1, throttle: 0, brake: 0 });
    expect(s.player!.v).toBeLessThan(free.player!.v - 2);
  });

  it('AC3: a slipstream raises speed on a straight', () => {
    const flat = { steer: 0, throttle: 1, brake: 0 };
    const solo = sim(STRAIGHT, [entrant('p', true)]);
    run(solo, 40, flat);
    const pair = sim(STRAIGHT, [entrant('lead', false), entrant('p', true)]);
    pair.cars[0]!.z += 14;
    let maxDraft = 0;
    run(pair, 40, flat, () => (maxDraft = Math.max(maxDraft, pair.player!.draft)));
    expect(maxDraft).toBeGreaterThan(0.4);
    expect(pair.player!.topSpeed).toBeGreaterThan(solo.player!.topSpeed + 0.4);
  });

  it('AC4: the car changes up through the gears and revs rise within a gear', () => {
    const s = sim(STRAIGHT, [entrant('p', true)]);
    const gears: number[] = [];
    const second: number[] = [];
    run(s, 40, { steer: 0, throttle: 1, brake: 0 }, () => {
      const c = s.player!;
      if (gears.at(-1) !== c.gear) gears.push(c.gear);
      if (c.gear === 2) second.push(c.rpm);
    });
    expect(gears).toEqual([1, 2, 3, 4, 5]);
    expect(second.at(-1)!).toBeGreaterThan(second[0]! + 1500);
  });

  it('AC5: a rear-drive car power-slides where a front-drive car does not', () => {
    const maxSlide = (dt: Drivetrain) => {
      const s = sim(curve(3.9), [entrant('p', true, dt)]);
      s.player!.v = 44;
      let m = 0;
      run(s, 1, { steer: 1, throttle: 1, brake: 0 }, () => (m = Math.max(m, s.player!.slide)));
      return m;
    };
    expect(maxSlide('RWD')).toBeGreaterThan(0.5);
    expect(maxSlide('FWD')).toBeLessThan(0.3);
  });

  it('AC6: contact affects both cars and is counted once per touch', () => {
    const s = sim(STRAIGHT, [entrant('p', true), entrant('b', false)]);
    const [a, b] = s.cars as [(typeof s.cars)[0], (typeof s.cars)[0]];
    a.v = 30;
    b.v = 30;
    b.x = 1.0;
    b.lane = 3.5;
    s.step({ steer: 0, throttle: 1, brake: 0 });
    expect(a.collisions).toBe(1);
    expect(b.collisions).toBe(1);
    expect(a.vx).toBeLessThan(0);
    expect(b.vx).toBeGreaterThan(0);
    run(s, 0.5, { steer: 0, throttle: 1, brake: 0 });
    expect(a.collisions).toBe(1);

    const t = sim(STRAIGHT, [entrant('p', true), entrant('b', false)]);
    const [rear, front] = t.cars as [(typeof t.cars)[0], (typeof t.cars)[0]];
    front.z += 4;
    rear.v = 40;
    front.v = 30;
    t.step({ steer: 0, throttle: 0, brake: 0 });
    expect(rear.v).toBeLessThan(36);
    expect(front.v).toBeGreaterThan(33);
  });
});

describe('race balance', () => {
  it('AI drivers stay on the road for a whole race', () => {
    const s = createRace(CATALOGUE, miata.id, baseStats(miata), 11);
    s.setPlayerAutopilot(true);
    let worst = 0;
    s.runToFinish(900, (sim) => {
      for (const c of sim.cars) if (!c.finished) worst = Math.max(worst, Math.abs(c.x));
      return { steer: 0, throttle: 0, brake: 0 };
    });
    expect(worst).toBeLessThan(ROAD_HALF_WIDTH + 0.4);
  });

  it('a perfect driver in a stock car fights for the podium but does not walk it', () => {
    const lines: string[] = [];
    for (const car of CATALOGUE.cars) {
      const pos: number[] = [];
      for (const seed of [1, 2, 3]) {
        const s = createRace(CATALOGUE, car.id, baseStats(car), seed);
        s.setPlayerAutopilot(true);
        pos.push(s.runToFinish().position);
      }
      lines.push(`${car.id}: ${pos.join(',')}`);
      expect(Math.min(...pos)).toBeLessThanOrEqual(3);
    }
    console.log('BALANCE ' + lines.join(' | '));
  });
});

describe('US-014 nitrous', () => {
  const flat = { steer: 0, throttle: 1, brake: 0 };
  it('AC4: a shot makes the car faster over the same time, and firing with none does nothing', () => {
    const run5 = (shots: number, press: boolean) => {
      const s = sim(STRAIGHT, [{ ...entrant('p', true), nitrous: shots }]);
      s.player!.v = 30;
      run(s, 0.1, { ...flat, nitro: press });
      run(s, 5, flat);
      return s.player!;
    };
    const plain = run5(0, false);
    const boosted = run5(1, true);
    const empty = run5(0, true);
    expect(boosted.z).toBeGreaterThan(plain.z + 8);
    expect(boosted.nitroShots).toBe(0);
    expect(boosted.nitroUsed).toBe(1);
    expect(empty.z).toBeCloseTo(plain.z, 6);
    expect(empty.nitroUsed).toBe(0);
  });

  it('fires one shot per press, not one per frame', () => {
    const s = sim(STRAIGHT, [{ ...entrant('p', true), nitrous: 3 }]);
    s.player!.v = 30;
    run(s, 1, { ...flat, nitro: true });
    expect(s.player!.nitroShots).toBe(2);
  });
});

describe('locations', () => {
  it('every location runs a full race with six cars, and rivals stay on the road', async () => {
    const { LOCATIONS } = await import('../data/locations.ts');
    for (const loc of LOCATIONS) {
      const s = createRace(CATALOGUE, miata.id, baseStats(miata), 5, { locationId: loc.id });
      expect(s.track.def.id).toBe(loc.trackId);
      s.setPlayerAutopilot(true);
      let worst = 0;
      const r = s.runToFinish(1200, (q) => {
        for (const c of q.cars)
          if (!c.finished && !c.isPlayer) worst = Math.max(worst, Math.abs(c.x));
        return { steer: 0, throttle: 0, brake: 0 };
      });
      expect(r.order).toHaveLength(6);
      expect(worst, loc.id).toBeLessThan(ROAD_HALF_WIDTH + 0.6);
      const lap = r.timeMs / 1000 / r.laps;
      expect(lap, loc.id).toBeGreaterThan(45);
      expect(lap, loc.id).toBeLessThan(130);
    }
  });

  it('a stock starter car is outclassed at the last location, and a Viper is not', async () => {
    const viper = CATALOGUE.cars.find((c) => c.id === 'viper-rt10-1994')!;
    const pos = (car: typeof miata) => {
      const s = createRace(CATALOGUE, car.id, baseStats(car), 3, { locationId: 'autodrome' });
      s.setPlayerAutopilot(true);
      return s.runToFinish(1200).position;
    };
    expect(pos(miata)).toBeGreaterThanOrEqual(5);
    expect(pos(viper)).toBeLessThanOrEqual(3);
  });
});

describe('US-017 race events and lines', () => {
  it('AC2: reports the player passing a rival, a rival passing the player, and a bump, once each', () => {
    const s = sim(STRAIGHT, [entrant('p', true), entrant('r', false)]);
    const [p, r] = s.cars as [(typeof s.cars)[0], (typeof s.cars)[0]];
    p.x = -2;
    r.x = 2;
    r.lane = 2;
    r.z = p.z + 10;
    p.v = 40;
    r.v = 20;
    r.autopilot = false;
    s.syncOrder();
    const seen: string[] = [];
    const tick = (seconds: number, input = { steer: 0, throttle: 1, brake: 0 }) =>
      run(s, seconds, input, () =>
        seen.push(...s.drainEvents().map((e) => `${e.type}:${e.carId}`)),
      );
    tick(1.5);
    expect(seen).toEqual(['playerPasses:r']);
    // Now the rival comes back past.
    p.v = 5;
    r.v = 45;
    tick(3, { steer: 0, throttle: 0, brake: 1 });
    expect(seen).toEqual(['playerPasses:r', 'passesPlayer:r']);
    // And contact.
    r.z = p.z;
    r.x = p.x + 1;
    tick(0.2);
    expect(seen.filter((e) => e === 'bump:r')).toHaveLength(1);
  });

  it('AC3: every racer has at least ten lines across all three events, shared with nobody', async () => {
    const { RACERS } = await import('../data/rivals.ts');
    expect(RACERS).toHaveLength(6);
    const all: string[] = [];
    for (const r of RACERS) {
      const lines = [...r.lines.passedByPlayer, ...r.lines.passesPlayer, ...r.lines.bump];
      expect(lines.length, r.id).toBeGreaterThanOrEqual(10);
      expect(
        r.lines.passedByPlayer.length && r.lines.passesPlayer.length && r.lines.bump.length,
      ).toBeGreaterThan(0);
      all.push(...lines);
    }
    expect(new Set(all).size).toBe(all.length);
  });

  it('a duel is two cars over two laps, with the racer in the car they drive here', async () => {
    const s = createRace(CATALOGUE, miata.id, baseStats(miata), 4, {
      locationId: 'autodrome',
      duelWith: 'nyx-calloway',
    });
    expect(s.cars.map((c) => c.id)).toEqual(['nyx-calloway', 'player']);
    expect(s.laps).toBe(2);
    expect(s.cars[0]!.carName).toContain('Viper');
    s.setPlayerAutopilot(true);
    expect(s.runToFinish(900).order).toHaveLength(2);
  });
});

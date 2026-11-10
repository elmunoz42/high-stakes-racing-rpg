import type { Performance } from '../rpg/carStats.ts';
import { msToKmh } from '../rpg/carStats.ts';
import { createRng, type Rng } from './rng.ts';
import { type Track, ROAD_HALF_WIDTH, SEGMENT_LENGTH, heightAt, segmentAt } from './track.ts';
import type { RaceEntryResult, RaceResult } from './types.ts';

/**
 * Deterministic race simulation. Fixed timestep, seeded RNG, SI units.
 * The renderer reads `RaceSim.cars`; it never writes to them.
 */

export const STEP = 1 / 60;
export const CAR_LENGTH = 4.2;
export const CAR_WIDTH = 1.8;
const MAX_LATERAL_SPEED = 7.5; // m/s of steering authority at speed
const OFFROAD_MAX_SPEED = 17; // m/s
const ROLLING_DRAG = 0.25; // m/s^2
const ENGINE_BRAKE = 1.6; // m/s^2 with throttle closed
const LATERAL_LIMIT = ROAD_HALF_WIDTH + 4.5;
const GRID_ROW_GAP = 9;
const LOOKAHEAD = 140; // m

export interface DriverInput {
  steer: number; // -1 (left) .. 1 (right)
  throttle: number; // 0..1
  brake: number; // 0..1
}

export const NO_INPUT: DriverInput = { steer: 0, throttle: 0, brake: 0 };

export interface Entrant {
  id: string;
  name: string;
  carName: string;
  isPlayer: boolean;
  perf: Performance;
  /** AI only: fraction of the theoretical limit this driver uses (0.85-1). */
  pace: number;
  color: string;
  body: 'roadster' | 'coupe' | 'hatch';
}

export interface SimCar extends Entrant {
  z: number; // distance travelled, m (negative on the grid)
  x: number; // lateral offset from centre line, m
  v: number; // m/s
  lane: number; // AI preferred line, m
  steerVisual: number;
  finished: boolean;
  finishTime: number;
  lapTimes: number[];
  lapStart: number;
  topSpeed: number;
  collisions: number;
  mistake: number; // seconds of lifting left
  autopilot: boolean;
}

export interface RaceConfig {
  track: Track;
  laps: number;
  entrants: Entrant[];
  seed: number;
}

export class RaceSim {
  readonly track: Track;
  readonly laps: number;
  readonly cars: SimCar[];
  readonly raceDistance: number;
  time = 0;
  started = false;
  private rng: Rng;
  private contacts = new Map<string, number>();
  private playerLedALap = false;

  constructor(cfg: RaceConfig) {
    this.track = cfg.track;
    this.laps = cfg.laps;
    this.rng = createRng(cfg.seed);
    this.raceDistance = cfg.laps * cfg.track.length;
    // Grid: two cars per row, player placed as given in entrants order.
    this.cars = cfg.entrants.map((e, i) => {
      const row = Math.floor(i / 2);
      const side = i % 2 === 0 ? -1 : 1;
      return {
        ...e,
        z: -row * GRID_ROW_GAP - 2,
        x: side * 2.4,
        v: 0,
        lane: side * (1.2 + this.rng() * 2),
        steerVisual: 0,
        finished: false,
        finishTime: 0,
        lapTimes: [],
        lapStart: 0,
        topSpeed: 0,
        collisions: 0,
        mistake: 0,
        autopilot: !e.isPlayer,
      };
    });
  }

  get player(): SimCar | undefined {
    return this.cars.find((c) => c.isPlayer);
  }

  /** Lap the car is on, 1-based, capped at the race laps. */
  lapOf(car: SimCar): number {
    return Math.min(this.laps, Math.max(1, Math.floor(Math.max(0, car.z) / this.track.length) + 1));
  }

  /** Current running order, leader first. */
  order(): SimCar[] {
    return [...this.cars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.z - a.z;
    });
  }

  positionOf(car: SimCar): number {
    return this.order().indexOf(car) + 1;
  }

  get playerFinished(): boolean {
    return !!this.player?.finished;
  }

  get allFinished(): boolean {
    return this.cars.every((c) => c.finished);
  }

  step(playerInput: DriverInput = NO_INPUT): void {
    if (!this.started) return;
    this.time += STEP;
    for (const car of this.cars) {
      if (car.finished) {
        // Cool-down lap: coast gently.
        car.v = Math.max(0, car.v - 3 * STEP);
        car.z += car.v * STEP;
        continue;
      }
      const input = car.autopilot ? this.drive(car) : playerInput;
      this.integrate(car, input);
    }
    this.resolveContacts();
    for (const car of this.cars) this.checkLaps(car);
  }

  /** Physics for one car, one step. */
  private integrate(car: SimCar, input: DriverInput): void {
    const seg = segmentAt(this.track, car.z);
    const { perf } = car;
    const offroad = Math.abs(car.x) > ROAD_HALF_WIDTH;

    // Longitudinal
    const vmax = perf.topSpeed;
    const throttle = Math.max(0, Math.min(1, input.throttle));
    const brake = Math.max(0, Math.min(1, input.brake));
    let a = throttle * perf.accel * Math.max(0, 1 - (car.v / vmax) ** 2);
    if (offroad) a *= 0.5;
    let d = ROLLING_DRAG + brake * perf.brakeDecel + (throttle < 0.05 ? ENGINE_BRAKE : 0);
    if (offroad && car.v > OFFROAD_MAX_SPEED) d += 7;
    const slope = (seg.y2 - seg.y1) / SEGMENT_LENGTH;
    a -= 9.81 * slope * 0.6;

    // Lateral: demanded cornering acceleration vs grip.
    const demand = car.v * car.v * Math.abs(seg.kappa);
    const grip = perf.lateralGrip * (offroad ? 0.7 : 1);
    const steerAuthority = MAX_LATERAL_SPEED * Math.min(1, car.v / 12);
    let drift = (demand / grip) * steerAuthority * 0.75;
    if (demand > grip) {
      const over = demand - grip;
      drift = steerAuthority * 0.75 + over * 1.3;
      d += over * 0.35; // tyres scrub speed when sliding
    }
    car.v = Math.max(0, Math.min(vmax * 1.02, car.v + (a - d) * STEP));

    const steer = Math.max(-1, Math.min(1, input.steer));
    car.x += (steer * steerAuthority - Math.sign(seg.kappa) * drift) * STEP;
    car.steerVisual += (steer - car.steerVisual) * 0.25;
    if (Math.abs(car.x) > LATERAL_LIMIT) {
      car.x = Math.sign(car.x) * LATERAL_LIMIT;
      car.v *= 0.985;
    }
    car.z += car.v * STEP;
    car.topSpeed = Math.max(car.topSpeed, car.v);
  }

  /** AI driver: brake for what is coming, hold a line, make the odd mistake. */
  drive(car: SimCar): DriverInput {
    const { perf } = car;
    const grip = perf.lateralGrip * 0.97;
    let target = perf.topSpeed;
    for (let s = 0; s <= LOOKAHEAD; s += SEGMENT_LENGTH * 2) {
      const k = Math.abs(segmentAt(this.track, car.z + s).kappa);
      if (k < 1e-5) continue;
      const vc = Math.sqrt(grip / k);
      const allowed = Math.sqrt(vc * vc + 2 * perf.brakeDecel * 0.8 * s);
      target = Math.min(target, allowed);
    }
    target *= car.pace;

    if (car.mistake > 0) car.mistake -= STEP;
    else if (!car.isPlayer && this.rng() < 0.0006) car.mistake = 0.5 + this.rng() * 0.6;

    let throttle = car.v < target - 0.4 ? 1 : car.v < target ? 0.4 : 0;
    const brake = car.v > target + 0.8 ? Math.min(1, (car.v - target) / 4) : 0;
    if (car.mistake > 0) throttle = Math.min(throttle, 0.2);

    // Steering: hold the preferred line, cancel the curve's push, avoid cars ahead.
    const seg = segmentAt(this.track, car.z);
    let lane = car.lane;
    for (const other of this.cars) {
      if (other === car) continue;
      const dz = other.z - car.z;
      if (dz > 0 && dz < 22 && Math.abs(other.x - car.x) < 2.4 && other.v < car.v + 1) {
        lane = other.x > 0 ? other.x - 3.2 : other.x + 3.2;
        break;
      }
    }
    lane = Math.max(-ROAD_HALF_WIDTH + 1.2, Math.min(ROAD_HALF_WIDTH - 1.2, lane));
    const authority = MAX_LATERAL_SPEED * Math.min(1, car.v / 12) || 1;
    const demand = car.v * car.v * Math.abs(seg.kappa);
    const drift = Math.min(1, demand / (perf.lateralGrip || 1)) * authority * 0.75;
    const wantVx = (lane - car.x) * 1.4;
    const steer = (wantVx + Math.sign(seg.kappa) * drift) / authority;
    return { steer: Math.max(-1, Math.min(1, steer)), throttle, brake };
  }

  private resolveContacts(): void {
    for (let i = 0; i < this.cars.length; i++) {
      for (let j = i + 1; j < this.cars.length; j++) {
        const a = this.cars[i]!;
        const b = this.cars[j]!;
        if (a.finished || b.finished) continue;
        const dz = b.z - a.z;
        const dx = b.x - a.x;
        if (Math.abs(dz) > CAR_LENGTH || Math.abs(dx) > CAR_WIDTH) continue;
        const [rear, front] = dz > 0 ? [a, b] : [b, a];
        rear.v = Math.min(rear.v, front.v) * 0.88;
        const push = (CAR_WIDTH - Math.abs(dx)) / 2 + 0.05;
        const dir = dx >= 0 ? 1 : -1;
        a.x -= dir * push;
        b.x += dir * push;
        const key = `${a.id}|${b.id}`;
        const last = this.contacts.get(key) ?? -10;
        if (this.time - last > 1) {
          a.collisions += 1;
          b.collisions += 1;
        }
        this.contacts.set(key, this.time);
      }
    }
  }

  private checkLaps(car: SimCar): void {
    if (car.finished) return;
    const completed = Math.floor(car.z / this.track.length);
    if (completed > car.lapTimes.length && car.z > 0) {
      car.lapTimes.push(this.time - car.lapStart);
      car.lapStart = this.time;
      if (car.isPlayer && this.positionOf(car) === 1) this.playerLedALap = true;
      if (completed >= this.laps) {
        car.finished = true;
        car.finishTime = this.time;
      }
    }
  }

  /**
   * Final classification. Cars still running are placed by projecting their
   * finish time from remaining distance at their average speed.
   */
  result(): RaceResult {
    const projected = this.cars.map((c) => {
      if (c.finished) return { car: c, t: c.finishTime };
      const remaining = this.raceDistance - c.z;
      const avg = Math.max(10, (c.z + 2) / Math.max(this.time, 1));
      return { car: c, t: this.time + remaining / avg };
    });
    projected.sort((a, b) => a.t - b.t);
    const order: RaceEntryResult[] = projected.map((p, i) => ({
      name: p.car.name,
      carName: p.car.carName,
      isPlayer: p.car.isPlayer,
      position: i + 1,
      timeMs: Math.round(p.t * 1000),
    }));
    const me = order.find((o) => o.isPlayer);
    const player = this.player;
    return {
      trackId: this.track.def.id,
      laps: this.laps,
      position: me?.position ?? order.length,
      timeMs: me?.timeMs ?? 0,
      collisions: player?.collisions ?? 0,
      ledALap: this.playerLedALap,
      topSpeedKmh: Math.round(msToKmh(player?.topSpeed ?? 0)),
      order,
    };
  }

  /** Run until the player (or everyone, if no player) finishes. For tests and fast-forward. */
  runToFinish(maxSeconds = 900, input: (sim: RaceSim) => DriverInput = () => NO_INPUT): RaceResult {
    this.started = true;
    const limit = maxSeconds / STEP;
    for (let i = 0; i < limit; i++) {
      if (this.player ? this.playerFinished : this.allFinished) break;
      this.step(input(this));
    }
    return this.result();
  }

  /** Lets the AI drive the player's car (tests, demo mode). */
  setPlayerAutopilot(on: boolean): void {
    const p = this.player;
    if (p) {
      p.autopilot = on;
      p.pace = 1;
    }
  }

  heightAt(z: number): number {
    return heightAt(this.track, z);
  }
}

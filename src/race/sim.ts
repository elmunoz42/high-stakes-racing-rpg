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
export const RUMBLE_WIDTH = 0.75; // m of kerb outside the road edge
export const REDLINE_RPM = 7000;
const MAX_LATERAL_SPEED = 7.5; // m/s of steering authority at speed
const OFFROAD_MAX_SPEED = 17; // m/s
const ROLLING_DRAG = 0.25; // m/s^2
const ENGINE_BRAKE = 1.6; // m/s^2 with throttle closed
const LATERAL_LIMIT = ROAD_HALF_WIDTH + 4.5;
const GRID_ROW_GAP = 9;
const LOOKAHEAD = 140; // m
/** Lateral response time, s: how long the car takes to answer the wheel. */
const RESPONSE_GRIP = 0.1;
const RESPONSE_SLIDE = 0.3;
/** Speed scrubbed by a full slide, m/s^2. */
const SLIDE_SCRUB = 3.2;
const HANDBRAKE_DECEL = 2.5;
/** Slipstream: reach behind a car, extra pull and extra top speed at full tow. */
const DRAFT_RANGE = 32;
const DRAFT_PULL = 0.7;
const DRAFT_TOP = 0.05;
/** Fraction of top speed at which each gear reaches the redline. */
const GEAR_TOPS = [0.24, 0.42, 0.62, 0.82, 1.08] as const;
const SHIFT_TIME = 0.16; // s of power cut on an upshift
/** Nitrous: how long a shot lasts, the extra shove and the extra top speed. */
export const NITRO_TIME = 3.2;
const NITRO_ACCEL = 3.4;
const NITRO_TOP = 0.13;

export type Surface = 'road' | 'rumble' | 'grass';
export type Drivetrain = 'FWD' | 'RWD' | 'AWD';

export interface DriverInput {
  steer: number; // -1 (left) .. 1 (right)
  throttle: number; // 0..1
  brake: number; // 0..1
  handbrake?: boolean;
  /** Fire a nitrous shot (acts on the press, not the hold). */
  nitro?: boolean;
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
  drivetrain?: Drivetrain;
  /** Nitrous shots carried at the start. */
  nitrous?: number;
}

export interface SimCar extends Entrant {
  drivetrain: Drivetrain;
  z: number; // distance travelled, m (negative on the grid)
  x: number; // lateral offset from centre line, m
  v: number; // m/s
  vx: number; // lateral velocity, m/s
  /** 0 = tyres gripping, 1 = fully sliding. */
  slide: number;
  /** 0..1 strength of the slipstream from a car ahead. */
  draft: number;
  gear: number; // 1..5
  rpm: number;
  shiftT: number; // s of power cut left
  nitroShots: number;
  nitroT: number; // s of boost left
  nitroUsed: number;
  nitroHeld: boolean;
  braking: boolean;
  surface: Surface;
  lane: number; // AI preferred line, m
  /** Smoothed yaw for drawing: steering plus slide angle, about -1.5..1.5. */
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
  /** Surface grip multiplier for the whole track (1 = dry asphalt). */
  readonly surfaceGrip: number;
  private rng: Rng;
  private contacts = new Map<string, number>();
  private playerLedALap = false;

  constructor(cfg: RaceConfig) {
    this.track = cfg.track;
    this.laps = cfg.laps;
    this.surfaceGrip = cfg.track.def.grip ?? 1;
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
        drivetrain: e.drivetrain ?? 'RWD',
        v: 0,
        vx: 0,
        slide: 0,
        draft: 0,
        gear: 1,
        rpm: 900,
        shiftT: 0,
        nitroShots: e.nitrous ?? 0,
        nitroT: 0,
        nitroUsed: 0,
        nitroHeld: false,
        braking: false,
        surface: 'road' as Surface,
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

  /** Slipstream strength from the nearest car directly ahead. */
  private updateDraft(car: SimCar): void {
    let best = 0;
    if (car.v > 20) {
      for (const other of this.cars) {
        if (other === car || other.v < 15) continue;
        const dz = other.z - car.z;
        if (dz <= CAR_LENGTH || dz >= DRAFT_RANGE || Math.abs(other.x - car.x) > 1.5) continue;
        best = Math.max(best, 1 - (dz - CAR_LENGTH) / (DRAFT_RANGE - CAR_LENGTH));
      }
    }
    car.draft += (best - car.draft) * 0.08;
    if (car.draft < 0.01) car.draft = 0;
  }

  /** Automatic gearbox: picks the gear, cuts power briefly on upshifts, sets revs. */
  private updateGearbox(car: SimCar): void {
    const f = car.v / car.perf.topSpeed;
    if (car.shiftT > 0) car.shiftT -= STEP;
    if (car.gear < GEAR_TOPS.length && f > GEAR_TOPS[car.gear - 1]! * 0.97) {
      car.gear += 1;
      car.shiftT = SHIFT_TIME;
    } else if (car.gear > 1 && f < GEAR_TOPS[car.gear - 2]! * 0.8) {
      car.gear -= 1;
    }
    const rpm = 1100 + (f / GEAR_TOPS[car.gear - 1]!) * (REDLINE_RPM - 1100);
    car.rpm = Math.max(900, Math.min(REDLINE_RPM + 200, rpm));
  }

  /** Physics for one car, one step. */
  private integrate(car: SimCar, input: DriverInput): void {
    const seg = segmentAt(this.track, car.z);
    const { perf } = car;
    const off = Math.abs(car.x) - ROAD_HALF_WIDTH;
    const surface: Surface = off > RUMBLE_WIDTH ? 'grass' : off > -0.1 ? 'rumble' : 'road';
    car.surface = surface;

    const throttle = Math.max(0, Math.min(1, input.throttle));
    const brake = Math.max(0, Math.min(1, input.brake));
    const steer = Math.max(-1, Math.min(1, input.steer));
    const handbrake = !!input.handbrake && car.v > 6;
    car.braking = brake > 0.1 || handbrake;

    // Longitudinal: engine through the gearbox, drag, brakes, slope, slipstream.
    this.updateDraft(car);
    this.updateGearbox(car);
    // Nitrous: one shot per press, a few seconds of shove.
    if (input.nitro && !car.nitroHeld && car.nitroShots > 0 && car.nitroT <= 0 && car.v > 3) {
      car.nitroShots -= 1;
      car.nitroUsed += 1;
      car.nitroT = NITRO_TIME;
    }
    car.nitroHeld = !!input.nitro;
    const boosting = car.nitroT > 0;
    if (boosting) car.nitroT -= STEP;
    const vmax = perf.topSpeed * (1 + DRAFT_TOP * car.draft + (boosting ? NITRO_TOP : 0));
    const power = car.shiftT > 0 ? 0 : throttle;
    let a = power * (perf.accel * Math.max(0, 1 - (car.v / vmax) ** 2) + DRAFT_PULL * car.draft);
    if (boosting) a += NITRO_ACCEL * Math.max(0.25, 1 - (car.v / vmax) ** 2);
    let d =
      ROLLING_DRAG +
      brake * perf.brakeDecel * this.surfaceGrip +
      (throttle < 0.05 ? ENGINE_BRAKE : 0);
    if (handbrake) d += HANDBRAKE_DECEL;
    if (surface === 'grass') {
      a *= 0.45;
      d += car.v > OFFROAD_MAX_SPEED ? 7 : 0.8;
    } else if (surface === 'rumble') d += 0.5;
    const slope = (seg.y2 - seg.y1) / SEGMENT_LENGTH;
    a -= 9.81 * slope * 0.6;

    // Lateral: what the corner demands against what the tyres can give.
    const demand = car.v * car.v * Math.abs(seg.kappa);
    let grip = perf.lateralGrip * this.surfaceGrip * (surface === 'grass' ? 0.6 : 1);
    if (car.drivetrain === 'FWD' && throttle > 0.8) grip *= 0.96; // power understeer
    if (brake > 0.8) grip *= 0.95; // braking and turning share the tyre
    grip *= 1 - 0.22 * car.slide;
    const authority = MAX_LATERAL_SPEED * Math.min(1, car.v / 12);
    const over = Math.max(0, demand - grip);
    const hold = Math.min(1, demand / grip);
    const push = hold * authority * 0.75 + over * 1.3;

    // Slide: understeer past the limit, power oversteer in rear-drive cars, handbrake.
    let wantSlide = Math.min(1, over / 2.5);
    const loaded = hold > 0.9 && Math.abs(steer) > 0.8 && car.v > 14;
    if (car.drivetrain === 'RWD' && throttle > 0.7 && loaded) wantSlide = Math.max(wantSlide, 0.6);
    if (handbrake) wantSlide = Math.max(wantSlide, Math.abs(steer) > 0.3 ? 1 : 0.35);
    car.slide += (wantSlide - car.slide) * Math.min(1, (wantSlide > car.slide ? 6 : 1.8) * STEP);
    if (car.slide < 0.005) car.slide = 0;
    d += car.slide * SLIDE_SCRUB + over * 0.35;

    // The car answers the wheel with a little lag; a sliding car answers slowly.
    const targetVx = steer * authority * (1 + 0.2 * car.slide) - Math.sign(seg.kappa) * push;
    const tau = RESPONSE_GRIP + (RESPONSE_SLIDE - RESPONSE_GRIP) * car.slide;
    car.vx += (targetVx - car.vx) * (1 - Math.exp(-STEP / tau));

    car.v = Math.max(0, Math.min(vmax * 1.02, car.v + (a - d) * STEP));
    car.x += car.vx * STEP;
    const slideDir = Math.abs(steer) > 0.1 ? Math.sign(steer) : -Math.sign(seg.kappa);
    const yaw = steer * 0.55 + car.slide * slideDir * 0.9;
    car.steerVisual += (yaw - car.steerVisual) * 0.18;
    if (Math.abs(car.x) > LATERAL_LIMIT) {
      car.x = Math.sign(car.x) * LATERAL_LIMIT;
      car.vx = 0;
      car.v *= 0.985;
    }
    car.z += car.v * STEP;
    car.topSpeed = Math.max(car.topSpeed, car.v);
  }

  /** AI driver: brake for what is coming, hold a line, make the odd mistake. */
  drive(car: SimCar): DriverInput {
    const { perf } = car;
    const grip = perf.lateralGrip * this.surfaceGrip * 0.97;
    let target = perf.topSpeed;
    // Look as far ahead as it would take to stop: fast cars need a long view.
    const reach = Math.max(
      LOOKAHEAD,
      (car.v * car.v) / (2 * perf.brakeDecel * this.surfaceGrip * 0.8) + 40,
    );
    for (let s = 0; s <= reach; s += SEGMENT_LENGTH * 2) {
      const k = Math.abs(segmentAt(this.track, car.z + s).kappa);
      if (k < 1e-5) continue;
      const vc = Math.sqrt(grip / k);
      const allowed = Math.sqrt(vc * vc + 2 * perf.brakeDecel * this.surfaceGrip * 0.8 * s);
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
      // Stay in the tow until close, then pull out to pass.
      if (dz > 0 && dz < 13 && Math.abs(other.x - car.x) < 2.4 && other.v < car.v + 1) {
        lane = other.x > 0 ? other.x - 3.2 : other.x + 3.2;
        break;
      }
    }
    lane = Math.max(-ROAD_HALF_WIDTH + 1.2, Math.min(ROAD_HALF_WIDTH - 1.2, lane));
    const authority = MAX_LATERAL_SPEED * Math.min(1, car.v / 12) || 1;
    const demand = car.v * car.v * Math.abs(seg.kappa);
    const drift =
      Math.min(1, demand / (perf.lateralGrip * this.surfaceGrip || 1)) * authority * 0.75;
    const wantVx = (lane - car.x) * 1.4;
    const steer = (wantVx + Math.sign(seg.kappa) * drift) / authority;
    return { steer: Math.max(-1, Math.min(1, steer)), throttle, brake };
  }

  /** Car-to-car contact: both cars feel it, and it is counted once per touch. */
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
        if (rear.v > front.v) {
          // Nose to tail: the car behind is checked, the car ahead gets a shove.
          const avg = (rear.v + front.v) / 2;
          rear.v = avg * 0.92;
          front.v = Math.min(front.perf.topSpeed * 1.02, avg * 1.03);
        } else {
          a.v *= 0.985;
          b.v *= 0.985;
        }
        const push = (CAR_WIDTH - Math.abs(dx)) / 2 + 0.05;
        const dir = dx >= 0 ? 1 : -1;
        a.x -= dir * push;
        b.x += dir * push;
        a.vx -= dir * 1.2;
        b.vx += dir * 1.2;
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
      nitrousUsed: player?.nitroUsed ?? 0,
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

import Phaser from 'phaser';
import { findCar } from '../../data/catalogue.ts';
import { createRace } from '../../race/field.ts';
import { fastForward } from '../../race/fastForward.ts';
import {
  buildDrawList,
  CAMERA_DEPTH,
  CAMERA_HEIGHT,
  HORIZON_Y,
  SCREEN_H,
  SCREEN_W,
  type SpriteDraw,
} from '../../race/projection.ts';
import { RaceSim, REDLINE_RPM, STEP, type DriverInput } from '../../race/sim.ts';
import { segmentAt } from '../../race/track.ts';
import type { RaceResult } from '../../race/types.ts';
import { installedParts } from '../../rpg/actions.ts';
import { carStats, msToKmh } from '../../rpg/carStats.ts';
import { store } from '../../save/store.ts';
import { h, mount } from '../../ui/dom.ts';
import { formatTime } from '../../ui/format.ts';
import { carRearTexture, CAR_H, CAR_W, generateRaceTextures, steerFrame } from '../art/textures.ts';
import { goto } from '../flow.ts';
import { registerHook } from '../testHooks.ts';

const COUNTDOWN_SECONDS = 3;
/** Background pixels per radian of heading change. */
const PX_PER_RAD = 220;
const TACH_ARC = 197.9; // length of the 270 degree gauge arc, r = 42

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r0: number;
  r1: number;
  color: number;
  alpha: number;
  kind: 'smoke' | 'dust' | 'spark' | 'pop';
}

export class RaceScene extends Phaser.Scene {
  private sim!: RaceSim;
  private road!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private sun!: Phaser.GameObjects.Image;
  private clouds!: Phaser.GameObjects.TileSprite;
  private mountains!: Phaser.GameObjects.TileSprite;
  private city!: Phaser.GameObjects.TileSprite;
  private pool: Phaser.GameObjects.Image[] = [];
  private particles: Particle[] = [];
  private accumulator = 0;
  private countdown = COUNTDOWN_SECONDS;
  private finishedAt = -1;
  private done = false;
  private keys!: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space',
    Phaser.Input.Keyboard.Key
  >;
  private steer = 0;
  private heading = 0;
  private clock = 0;
  private lastGear = 1;
  private lastContacts = 0;
  private playerSprite: SpriteDraw | null = null;
  private hud!: {
    speed: HTMLElement;
    lap: HTMLElement;
    pos: HTMLElement;
    count: HTMLElement;
    time: HTMLElement;
    gear: HTMLElement;
    arc: SVGPathElement;
    tow: HTMLElement;
    markers: HTMLElement[];
  };

  constructor() {
    super('Race');
  }

  create(data: { seed?: number } = {}): void {
    const state = store.require();
    const cat = store.catalogue;
    const car = findCar(cat, state.carId)!;
    const stats = carStats(car, installedParts(cat, state));
    const seed = data.seed ?? seedFromUrl() ?? state.seed * 1000 + state.raceCount;
    this.sim = createRace(cat, state.carId, stats, seed);
    this.accumulator = 0;
    this.countdown = COUNTDOWN_SECONDS;
    this.finishedAt = -1;
    this.done = false;
    this.steer = 0;
    this.heading = 0;
    this.clock = 0;
    this.lastGear = 1;
    this.lastContacts = 0;
    this.pool = [];
    this.particles = [];
    generateRaceTextures(this);

    this.add
      .image(0, 0, 'bg-sky')
      .setOrigin(0, 0)
      .setDisplaySize(SCREEN_W, HORIZON_Y + 8);
    this.sun = this.add.image(250, HORIZON_Y - 22, 'bg-sun');
    this.clouds = this.add.tileSprite(0, 14, SCREEN_W, 46, 'bg-clouds').setOrigin(0, 0);
    this.mountains = this.add
      .tileSprite(0, HORIZON_Y - 40, SCREEN_W, 44, 'bg-mountains')
      .setOrigin(0, 0);
    this.city = this.add.tileSprite(0, HORIZON_Y - 41, SCREEN_W, 46, 'bg-city').setOrigin(0, 0);
    this.road = this.add.graphics().setDepth(1);
    this.fx = this.add.graphics().setDepth(900);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(K.UP),
      down: kb.addKey(K.DOWN),
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      w: kb.addKey(K.W),
      a: kb.addKey(K.A),
      s: kb.addKey(K.S),
      d: kb.addKey(K.D),
      space: kb.addKey(K.SPACE),
    };

    this.buildHud();
    registerHook('race', {
      fastForward: ({ finishPosition }: { finishPosition: number }) =>
        this.finish(fastForward(this.sim, finishPosition)),
      autopilot: (on: boolean) => this.sim.setPlayerAutopilot(on),
      snapshot: () => {
        const p = this.sim.player!;
        return {
          started: this.sim.started,
          time: this.sim.time,
          speedKmh: Math.round(msToKmh(p.v)),
          x: p.x,
          z: p.z,
          lap: this.sim.lapOf(p),
          position: this.sim.positionOf(p),
          cars: this.sim.cars.length,
          gear: p.gear,
          rpm: Math.round(p.rpm),
          slide: p.slide,
          draft: p.draft,
          smoke: this.particles.filter((q) => q.kind === 'smoke').length,
        };
      },
    });
    this.events.once('shutdown', () => registerHook('race', null));
    this.renderFrame(0);
  }

  private buildHud(): void {
    const speed = h('div', { class: 'kmh', 'aria-label': 'Speed' }, '0 km/h');
    const gear = h('div', { class: 'gear', 'aria-label': 'Gear' }, '1');
    const lap = h('span', { class: 'chip', 'aria-label': 'Lap' }, `Lap 1/${this.sim.laps}`);
    const pos = h('span', { class: 'chip big', 'aria-label': 'Position' }, 'P5/6');
    const time = h('span', { class: 'chip', 'aria-label': 'Race time' }, '0:00.0');
    const count = h('div', { class: 'countdown', role: 'status' }, String(COUNTDOWN_SECONDS));
    const tow = h('div', { class: 'tow hidden', 'data-testid': 'slipstream' }, 'SLIPSTREAM');
    const tach = h('div', { class: 'tach', 'aria-hidden': 'true' });
    tach.innerHTML = `<svg viewBox="0 0 100 100">
      <path d="M 20.3 79.7 A 42 42 0 1 1 79.7 79.7" class="track"/>
      <path d="M 20.3 79.7 A 42 42 0 1 1 79.7 79.7" class="red" stroke-dasharray="0 172 26 400"/>
      <path d="M 20.3 79.7 A 42 42 0 1 1 79.7 79.7" class="value" stroke-dasharray="0 400"/>
    </svg>`;
    const markers = this.sim.cars.map((c) =>
      h('i', {
        class: c.isPlayer ? 'me' : '',
        'data-testid': 'progress-marker',
        style: `background:${c.isPlayer ? '#ffcc33' : c.color}`,
        title: c.name,
      }),
    );
    const progress = h(
      'div',
      { class: 'progress', role: 'img', 'aria-label': 'Lap progress' },
      markers,
    );
    mount(
      'race-hud',
      h(
        'div',
        { class: 'race-hud', 'data-testid': 'race-hud' },
        h('div', { class: 'top' }, lap, time, pos),
        progress,
        h('div', { class: 'cluster' }, tach, gear, speed),
        tow,
        h('div', { class: 'keys' }, '↑ gas · ↓ brake · ← → steer · Space handbrake'),
        count,
      ),
    );
    this.hud = {
      speed,
      lap,
      pos,
      count,
      time,
      gear,
      arc: tach.querySelector('.value')!,
      tow,
      markers,
    };
  }

  override update(_time: number, deltaMs: number): void {
    if (this.done) return;
    const dt = Math.min(0.1, deltaMs / 1000);
    this.clock += dt;

    if (!this.sim.started) {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      const label = n > 0 ? String(n) : 'GO!';
      if (this.hud.count.textContent !== label) {
        this.hud.count.textContent = label;
        this.hud.count.classList.remove('pulse');
        void this.hud.count.offsetWidth;
        this.hud.count.classList.add('pulse');
      }
      if (this.countdown <= 0) {
        this.sim.started = true;
        this.time.delayedCall(700, () => this.hud.count.remove());
      }
    }

    const input = this.readInput(dt);
    this.accumulator += dt;
    while (this.accumulator >= STEP) {
      this.sim.step(input);
      this.accumulator -= STEP;
    }

    if (this.sim.playerFinished && this.finishedAt < 0) {
      this.finishedAt = this.sim.time;
      this.hud.count.textContent = 'FINISH';
      if (!this.hud.count.isConnected)
        this.hud.speed.parentElement?.parentElement?.append(this.hud.count);
    }
    if (this.finishedAt >= 0 && this.sim.time - this.finishedAt > 1.8) {
      this.finish(this.sim.result());
      return;
    }
    this.renderFrame(dt);
    this.updateHud();
  }

  private readInput(dt: number): DriverInput {
    if (!this.sim.started || this.sim.playerFinished) return { steer: 0, throttle: 0, brake: 0 };
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const target = (right ? 1 : 0) - (left ? 1 : 0);
    // Smooth keyboard steering so taps are small corrections.
    const rate = target === 0 ? 8 : 5;
    this.steer += Math.max(-rate * dt, Math.min(rate * dt, target - this.steer));
    return {
      steer: this.steer,
      throttle: k.up.isDown || k.w.isDown ? 1 : 0,
      brake: k.down.isDown || k.s.isDown ? 1 : 0,
      handbrake: k.space.isDown,
    };
  }

  private renderFrame(dt: number): void {
    const p = this.sim.player!;
    const pct = Math.min(1, p.v / p.perf.topSpeed);

    // Camera: wider and lower at speed; rattles on kerbs and grass.
    const cam = {
      depth: CAMERA_DEPTH * (1 - 0.1 * pct * pct),
      height: CAMERA_HEIGHT * (1 - 0.05 * pct),
    };
    const rough = p.surface === 'grass' ? 1.6 : p.surface === 'rumble' ? 0.8 : p.slide * 0.5;
    const amp = rough * Math.min(1, p.v / 20);
    this.cameras.main.setScroll(
      Math.round(Math.sin(this.clock * 61) * amp * 0.6),
      Math.round(Math.sin(this.clock * 47) * amp),
    );

    const list = buildDrawList(this.sim, cam);
    const g = this.road;
    g.clear();
    for (const q of list.quads) {
      g.fillStyle(q.color, 1);
      g.fillPoints(
        [
          { x: q.x1 - q.w1, y: q.y1 },
          { x: q.x1 + q.w1, y: q.y1 },
          { x: q.x2 + q.w2, y: q.y2 },
          { x: q.x2 - q.w2, y: q.y2 },
        ] as Phaser.Math.Vector2[],
        true,
      );
    }

    // The sky turns as the road does.
    this.heading += segmentAt(this.sim.track, p.z).kappa * p.v * dt;
    const turn = this.heading * PX_PER_RAD;
    this.clouds.tilePositionX = turn * 0.5 + this.clock * 1.5;
    this.mountains.tilePositionX = turn * 0.8;
    this.city.tilePositionX = turn;
    const lapPx = Math.PI * 2 * PX_PER_RAD * 0.5;
    this.sun.x = ((((250 - turn * 0.5) % lapPx) + lapPx) % lapPx) - 48;

    let i = 0;
    for (const s of list.sprites) this.drawSprite(i++, s);
    for (; i < this.pool.length; i++) this.pool[i]!.setVisible(false);

    this.playerSprite = list.sprites.at(-1) ?? null;
    this.emitEffects(dt, pct);
    this.drawEffects(dt, pct);
  }

  private drawSprite(i: number, s: SpriteDraw): void {
    if (s.y - s.h >= s.clipY) {
      this.pool[i]?.setVisible(false);
      return;
    }
    let img = this.pool[i];
    const key = s.car
      ? carRearTexture(this, s.car.body, s.car.color, steerFrame(s.car.steer), s.car.braking)
      : s.key;
    if (!img) {
      img = this.add.image(0, 0, key).setOrigin(0.5, 1);
      this.pool.push(img);
    } else if (img.texture.key !== key) {
      img.setTexture(key);
    }
    const frameW = s.car ? CAR_W : img.frame.width;
    const frameH = s.car ? CAR_H : img.frame.height;
    let y = s.y;
    if (s.car && s.car.surface !== 'road') y += Math.round(Math.sin(this.clock * 53 + s.x) * 1.2);
    img
      .setVisible(true)
      .setDepth(2 + s.depth / 100)
      .setFlipX(s.flip);
    img.setPosition(Math.round(s.x), Math.round(y));
    img.setDisplaySize(Math.max(1, s.w), Math.max(1, s.h));
    if (s.y > s.clipY) {
      const visible = Math.max(0, 1 - (s.y - s.clipY) / s.h);
      img.setCrop(0, 0, frameW, frameH * visible);
    } else {
      img.setCrop();
    }
    img.setAngle(s.car ? s.car.steer * (s.car.isPlayer ? 3 : 2) : 0);
  }

  private spawn(p: Particle): void {
    if (this.particles.length < 260) this.particles.push(p);
  }

  private emitEffects(dt: number, pct: number): void {
    const p = this.sim.player!;
    const s = this.playerSprite;
    if (!s || dt === 0) return;
    const rnd = Math.random;
    const wheels = [s.x - s.w * 0.31, s.x + s.w * 0.31];
    const drift = -Math.sign(p.steerVisual || 1) * 22;

    if (p.slide > 0.25 && p.v > 8 && p.surface !== 'grass') {
      for (const wx of wheels)
        this.spawn({
          x: wx + (rnd() - 0.5) * 4,
          y: s.y - 3,
          vx: drift + (rnd() - 0.5) * 16,
          vy: -12 - rnd() * 18,
          life: 0,
          max: 0.55 + rnd() * 0.3,
          r0: 2.5,
          r1: 9 + p.slide * 5,
          color: 0xe6e6ea,
          alpha: 0.42 * p.slide,
          kind: 'smoke',
        });
    }
    if (p.surface === 'grass' && p.v > 5) {
      for (const wx of wheels)
        this.spawn({
          x: wx,
          y: s.y - 2,
          vx: (rnd() - 0.5) * 40,
          vy: -20 - rnd() * 30,
          life: 0,
          max: 0.5,
          r0: 2,
          r1: 7,
          color: rnd() > 0.5 ? 0xb9a070 : 0x5d8a4a,
          alpha: 0.6,
          kind: 'dust',
        });
    }
    if (p.gear > this.lastGear && pct > 0.2) {
      for (let k = 0; k < 4; k++)
        this.spawn({
          x: s.x + s.w * 0.2,
          y: s.y - s.h * 0.16,
          vx: 10 + rnd() * 20,
          vy: -4 - rnd() * 8,
          life: 0,
          max: 0.22,
          r0: 2,
          r1: 4,
          color: k % 2 ? 0xffb347 : 0xfff0a0,
          alpha: 0.9,
          kind: 'pop',
        });
    }
    this.lastGear = p.gear;
    if (p.collisions > this.lastContacts) {
      this.cameras.main.shake(160, 0.008);
      for (let k = 0; k < 14; k++)
        this.spawn({
          x: s.x + (rnd() - 0.5) * s.w,
          y: s.y - s.h * 0.4,
          vx: (rnd() - 0.5) * 160,
          vy: -rnd() * 120,
          life: 0,
          max: 0.35,
          r0: 1.5,
          r1: 0.5,
          color: rnd() > 0.4 ? 0xffe066 : 0xffffff,
          alpha: 1,
          kind: 'spark',
        });
    }
    this.lastContacts = p.collisions;
  }

  private drawEffects(dt: number, pct: number): void {
    const g = this.fx;
    g.clear();
    this.particles = this.particles.filter((q) => (q.life += dt) < q.max);
    for (const q of this.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.kind === 'spark') q.vy += 420 * dt;
      const t = q.life / q.max;
      g.fillStyle(q.color, q.alpha * (1 - t));
      g.fillCircle(Math.round(q.x), Math.round(q.y), q.r0 + (q.r1 - q.r0) * t);
    }
    // Speed lines when flat out or in a tow.
    const p = this.sim.player!;
    const rush = Math.max((pct - 0.86) / 0.14, p.draft > 0.3 ? p.draft * 0.8 : 0);
    if (rush > 0.05) {
      const cx = SCREEN_W / 2;
      const cy = HORIZON_Y + 6;
      g.lineStyle(1, 0xffffff, Math.min(0.45, 0.3 * rush));
      const n = Math.round(4 + 10 * Math.min(1, rush));
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = 95 + Math.random() * 110;
        const len = 8 + Math.random() * 22 * Math.min(1, rush);
        const x0 = cx + Math.cos(a) * r * 1.3;
        const y0 = cy + Math.sin(a) * r * 0.75;
        // Keep streaks on the ground and at the edges, so they do not read as rain.
        if (y0 < HORIZON_Y + 4 || y0 > SCREEN_H || Math.abs(x0 - cx) < 70) continue;
        g.lineBetween(x0, y0, x0 + Math.cos(a) * len * 1.3, y0 + Math.sin(a) * len * 0.75);
      }
    }
  }

  private updateHud(): void {
    const p = this.sim.player!;
    const L = this.sim.track.length;
    this.hud.speed.textContent = `${Math.round(msToKmh(p.v))} km/h`;
    this.hud.gear.textContent = String(p.gear);
    const rev = Math.min(1, p.rpm / (REDLINE_RPM + 200));
    this.hud.arc.setAttribute('stroke-dasharray', `${(TACH_ARC * rev).toFixed(1)} 400`);
    this.hud.arc.classList.toggle('hot', p.rpm > REDLINE_RPM - 500);
    this.hud.lap.textContent = `Lap ${this.sim.lapOf(p)}/${this.sim.laps}`;
    this.hud.pos.textContent = `P${this.sim.positionOf(p)}/${this.sim.cars.length}`;
    this.hud.time.textContent = formatTime(this.sim.time * 1000);
    this.hud.tow.classList.toggle('hidden', p.draft < 0.2);
    this.sim.cars.forEach((c, i) => {
      const f = (((c.z % L) + L) % L) / L;
      this.hud.markers[i]!.style.left = `${(f * 100).toFixed(1)}%`;
    });
  }

  private finish(result: RaceResult): void {
    if (this.done) return;
    this.done = true;
    this.cameras.main.setScroll(0, 0);
    const r = store.dispatch({ type: 'recordRace', result });
    if (!r.ok) console.error('[race] could not record result', r.error);
    goto('Results');
  }
}

function seedFromUrl(): number | undefined {
  try {
    const v = new URLSearchParams(location.search).get('seed');
    return v ? Number(v) : undefined;
  } catch {
    return undefined;
  }
}

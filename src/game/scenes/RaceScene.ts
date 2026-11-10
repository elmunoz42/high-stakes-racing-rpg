import Phaser from 'phaser';
import { findCar } from '../../data/catalogue.ts';
import { createRace } from '../../race/field.ts';
import { fastForward } from '../../race/fastForward.ts';
import { buildDrawList, HORIZON_Y, SCREEN_W, type SpriteDraw } from '../../race/projection.ts';
import { RaceSim, STEP, type DriverInput } from '../../race/sim.ts';
import { segmentAt } from '../../race/track.ts';
import type { RaceResult } from '../../race/types.ts';
import { installedParts } from '../../rpg/actions.ts';
import { carStats, msToKmh } from '../../rpg/carStats.ts';
import { store } from '../../save/store.ts';
import { h, mount } from '../../ui/dom.ts';
import { goto } from '../flow.ts';
import { registerHook } from '../testHooks.ts';
import { carTexture, CAR_TEX_H, CAR_TEX_W } from '../textures.ts';

const COUNTDOWN_SECONDS = 3;

export class RaceScene extends Phaser.Scene {
  private sim!: RaceSim;
  private road!: Phaser.GameObjects.Graphics;
  private skyline!: Phaser.GameObjects.TileSprite;
  private hills!: Phaser.GameObjects.TileSprite;
  private pool: Phaser.GameObjects.Image[] = [];
  private accumulator = 0;
  private countdown = COUNTDOWN_SECONDS;
  private finishedAt = -1;
  private done = false;
  private keys!: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space',
    Phaser.Input.Keyboard.Key
  >;
  private steer = 0;
  private parallax = 0;
  private hud!: {
    speed: HTMLElement;
    lap: HTMLElement;
    pos: HTMLElement;
    count: HTMLElement;
    time: HTMLElement;
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
    this.pool = [];

    this.add
      .image(0, 0, 'sky')
      .setOrigin(0, 0)
      .setDisplaySize(SCREEN_W, HORIZON_Y + 4);
    this.skyline = this.add.tileSprite(0, HORIZON_Y - 38, SCREEN_W, 40, 'skyline').setOrigin(0, 0);
    this.hills = this.add.tileSprite(0, HORIZON_Y - 22, SCREEN_W, 30, 'hills').setOrigin(0, 0);
    this.road = this.add.graphics().setDepth(1);

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

    const speed = h('div', { class: 'speed', 'aria-label': 'Speed' }, '0 km/h');
    const lap = h('span', { class: 'chip', 'aria-label': 'Lap' }, `Lap 1/${this.sim.laps}`);
    const pos = h('span', { class: 'chip', 'aria-label': 'Position' }, 'P5/6');
    const time = h('span', { class: 'chip', 'aria-label': 'Race time' }, '0:00.0');
    const count = h('div', { class: 'countdown', role: 'status' }, String(COUNTDOWN_SECONDS));
    mount(
      'race-hud',
      h(
        'div',
        { class: 'race-hud', 'data-testid': 'race-hud' },
        h('div', { class: 'top' }, lap, time, pos),
        speed,
        count,
      ),
    );
    this.hud = { speed, lap, pos, count, time };

    registerHook('race', {
      fastForward: ({ finishPosition }: { finishPosition: number }) =>
        this.finish(fastForward(this.sim, finishPosition)),
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
        };
      },
    });
    this.events.once('shutdown', () => registerHook('race', null));
    this.renderFrame();
  }

  override update(_time: number, deltaMs: number): void {
    if (this.done) return;
    const dt = Math.min(0.1, deltaMs / 1000);

    if (!this.sim.started) {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      this.hud.count.textContent = n > 0 ? String(n) : 'GO!';
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
      if (!this.hud.count.isConnected) this.hud.speed.parentElement?.append(this.hud.count);
    }
    if (this.finishedAt >= 0 && this.sim.time - this.finishedAt > 1.8) {
      this.finish(this.sim.result());
      return;
    }
    this.renderFrame();
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
      brake: k.down.isDown || k.s.isDown || k.space.isDown ? 1 : 0,
    };
  }

  private renderFrame(): void {
    const list = buildDrawList(this.sim);
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

    // Parallax: the background drifts against the curve the player is on.
    const p = this.sim.player!;
    this.parallax += segmentAt(this.sim.track, p.z).kappa * p.v * 1.2;
    this.skyline.tilePositionX = this.parallax * 0.4;
    this.hills.tilePositionX = this.parallax;

    let i = 0;
    for (const s of list.sprites) this.drawSprite(i++, s);
    for (; i < this.pool.length; i++) this.pool[i]!.setVisible(false);
  }

  private drawSprite(i: number, s: SpriteDraw): void {
    if (s.y - s.h >= s.clipY) {
      this.pool[i]?.setVisible(false);
      return;
    }
    let img = this.pool[i];
    const key = s.car ? carTexture(this, s.car.body, s.car.color) : s.key;
    if (!img) {
      img = this.add.image(0, 0, key).setOrigin(0.5, 1);
      this.pool.push(img);
    } else if (img.texture.key !== key) {
      img.setTexture(key);
    }
    const frameW = s.car ? CAR_TEX_W : img.frame.width;
    const frameH = s.car ? CAR_TEX_H : img.frame.height;
    img
      .setVisible(true)
      .setDepth(2 + s.depth / 100)
      .setFlipX(s.flip);
    img.setPosition(Math.round(s.x), Math.round(s.y));
    img.setDisplaySize(Math.max(1, s.w), Math.max(1, s.h));
    if (s.y > s.clipY) {
      const visible = Math.max(0, 1 - (s.y - s.clipY) / s.h);
      img.setCrop(0, 0, frameW, frameH * visible);
    } else {
      img.setCrop();
    }
    img.setAngle(s.car ? s.car.steer * (s.car.isPlayer ? 4 : 2) : 0);
  }

  private updateHud(): void {
    const p = this.sim.player!;
    this.hud.speed.textContent = `${Math.round(msToKmh(p.v))} km/h`;
    this.hud.lap.textContent = `Lap ${this.sim.lapOf(p)}/${this.sim.laps}`;
    this.hud.pos.textContent = `P${this.sim.positionOf(p)}/${this.sim.cars.length}`;
    this.hud.time.textContent = formatTime(this.sim.time * 1000);
  }

  private finish(result: RaceResult): void {
    if (this.done) return;
    this.done = true;
    const r = store.dispatch({ type: 'recordRace', result });
    if (!r.ok) console.error('[race] could not record result', r.error);
    goto('Results');
  }
}

export function formatTime(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

function seedFromUrl(): number | undefined {
  try {
    const v = new URLSearchParams(location.search).get('seed');
    return v ? Number(v) : undefined;
  } catch {
    return undefined;
  }
}

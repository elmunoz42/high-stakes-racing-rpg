import Phaser from 'phaser';
import { store } from '../../save/store.ts';
import { h, mount } from '../../ui/dom.ts';
import { carRearTexture, canvasTexture } from '../art/textures.ts';
import {
  drawTitleCity,
  drawTitleLogo,
  drawTitleSky,
  LOGO_H,
  LOGO_W,
  TITLE_H,
  TITLE_HORIZON,
  TITLE_W,
} from '../art/title.ts';
import { goto } from '../flow.ts';

const CX = 150; // road vanishing point and car, left of centre: the menu sits right
const NEON = [0xff3d8b, 0x3df0ff, 0xffd27a, 0xff3d8b, 0x7af0ff];

/**
 * Attract screen: a night street race for money. The road scrolls under your
 * car, searchlights sweep the sky, the wet road throws back the city's neon.
 */
export class TitleScene extends Phaser.Scene {
  private road!: Phaser.GameObjects.Graphics;
  private beams!: Phaser.GameObjects.Graphics;
  private car!: Phaser.GameObjects.Image;
  private logo!: Phaser.GameObjects.Image;
  private puffs: { x: number; y: number; t: number }[] = [];
  private clock = 0;

  constructor() {
    super('Title');
  }

  create(): void {
    this.clock = 0;
    this.puffs = [];
    canvasTexture(this, 'title-sky', TITLE_W, TITLE_HORIZON, drawTitleSky);
    canvasTexture(this, 'title-city', TITLE_W, 72, drawTitleCity);
    canvasTexture(this, 'title-logo', LOGO_W, LOGO_H, (c) => drawTitleLogo(c, LOGO_W, LOGO_H));

    this.add.image(0, 0, 'title-sky').setOrigin(0, 0);
    this.beams = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(0, TITLE_HORIZON - 72, 'title-city').setOrigin(0, 0);
    this.road = this.add.graphics();
    this.car = this.add
      .image(CX, TITLE_H - 6, carRearTexture(this, 'coupe', '#c81e1e', 0, true))
      .setOrigin(0.5, 1);
    this.logo = this.add.image(TITLE_W / 2, 46, 'title-logo');

    const hasSave = store.hasSave();
    const newCareer = h(
      'button',
      { class: hasSave ? '' : 'primary', onclick: () => confirmNew() },
      'New career',
    );
    const cont = hasSave
      ? h(
          'button',
          { class: 'primary', onclick: () => (store.load() ? goto('Town') : goto('CarPick')) },
          'Continue',
        )
      : null;
    const menu = h('div', { class: 'menu interactive', role: 'menu' }, cont, newCareer);
    const confirmNew = () => {
      if (!hasSave) return goto('CarPick');
      menu.replaceChildren(
        h('p', { class: 'panel', style: 'margin:0' }, 'Starting over replaces your saved career.'),
        h('button', { class: 'primary', onclick: () => goto('CarPick') }, 'Start a new career'),
        h('button', { onclick: () => this.scene.restart() }, 'Keep my career'),
      );
    };
    mount(
      'title',
      h(
        'div',
        { class: 'layer title-screen' },
        h('h1', { class: 'sr-only' }, 'High Stakes - Racing RPG'),
        menu,
        h('div', { class: 'title-foot' }, 'Street cars · real parts · night races for money'),
      ),
    );
    (cont ?? newCareer).focus();
  }

  override update(_t: number, deltaMs: number): void {
    const dt = Math.min(0.1, deltaMs / 1000);
    this.clock += dt;
    this.drawBeams();
    this.drawRoad();
    // The car breathes on its springs; the logo floats.
    this.car.y = TITLE_H - 6 + (Math.floor(this.clock * 9) % 2);
    this.logo.y = 46 + Math.round(Math.sin(this.clock * 1.6) * 1.5);
  }

  /** Two searchlights sweeping the sky behind the city. */
  private drawBeams(): void {
    const g = this.beams;
    g.clear();
    for (const [x, phase, col] of [
      [70, 0, 0x9ab8ff],
      [320, 2.1, 0xffb0e0],
    ] as const) {
      const a = -Math.PI / 2 + Math.sin(this.clock * 0.5 + phase) * 0.5;
      const len = 170;
      const spread = 0.07;
      g.fillStyle(col, 0.1);
      g.fillTriangle(
        x,
        TITLE_HORIZON - 30,
        x + Math.cos(a - spread) * len,
        TITLE_HORIZON - 30 + Math.sin(a - spread) * len,
        x + Math.cos(a + spread) * len,
        TITLE_HORIZON - 30 + Math.sin(a + spread) * len,
      );
    }
  }

  /** A wet road to the horizon: kerbs and dashes scrolling, neon reflected. */
  private drawRoad(): void {
    const g = this.road;
    g.clear();
    const top = TITLE_HORIZON;
    const rows = TITLE_H - top;
    const scroll = (this.clock * 2.2) % 1;
    for (let i = 0; i < rows; i++) {
      const y = top + i;
      const p = (i + 1) / rows; // 0 at the horizon, 1 at the bottom
      const half = 6 + p * 240;
      // Distance down the road, for stripes that rush towards you.
      const z = 1 / (p + 0.04);
      const stripe = Math.floor(z * 1.6 + scroll * 2) % 2 === 0;
      // Verge, kerbs, asphalt: the asphalt is wet and darker near the horizon.
      g.fillStyle(0x0c0c18, 1).fillRect(0, y, TITLE_W, 1);
      g.fillStyle(stripe ? 0xd7263d : 0xeeeeee, 1).fillRect(CX - half * 1.12, y, half * 2.24, 1);
      const asphalt = Phaser.Display.Color.GetColor(30 + p * 22, 30 + p * 20, 44 + p * 24);
      g.fillStyle(asphalt, 1).fillRect(CX - half, y, half * 2, 1);
      if (stripe && p > 0.05)
        g.fillStyle(0xf2f2f2, 1).fillRect(CX - half * 0.03, y, half * 0.06, 1);
    }
    // Haze where the road meets the city, lit pink from below.
    for (let i = 0; i < 10; i++)
      g.fillStyle(0xff5aa0, 0.16 * (1 - i / 10)).fillRect(0, top - 6 + i, TITLE_W, 1);
    // Neon from the city, smeared down the wet road.
    NEON.forEach((col, k) => {
      const x = CX - 120 + k * 60 + Math.sin(this.clock * 0.7 + k) * 2;
      for (let i = 0; i < 26; i += 2) {
        const flick = 0.12 + 0.06 * Math.sin(this.clock * 6 + k * 2 + i);
        g.fillStyle(col, flick * (1 - i / 26)).fillRect(
          x - 1 + ((i * 7) % 3) - 1,
          top + 2 + i,
          3,
          1,
        );
      }
    });
    // Exhaust: soft puffs drifting up from the tailpipes.
    if (Math.random() < 0.3)
      this.puffs.push({ x: CX + 20 + Math.random() * 6, y: TITLE_H - 16, t: 0 });
    this.puffs = this.puffs.filter((q) => (q.t += 1 / 60) < 1.2);
    for (const q of this.puffs) {
      const r = 2 + q.t * 7;
      g.fillStyle(0xd8d8e8, 0.22 * (1 - q.t / 1.2)).fillCircle(q.x + q.t * 10, q.y - q.t * 14, r);
    }
    // Rivals far ahead: pairs of tail lights.
    for (const [dx, dy] of [
      [-14, 4],
      [10, 9],
    ] as const) {
      g.fillStyle(0xff3a2c, 0.9)
        .fillRect(CX + dx - 3, top + dy, 2, 1)
        .fillRect(CX + dx + 2, top + dy, 2, 1);
    }
  }
}

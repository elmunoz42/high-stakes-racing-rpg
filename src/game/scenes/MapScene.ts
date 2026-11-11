import Phaser from 'phaser';
import { findCar } from '../../data/catalogue.ts';
import type { Location } from '../../data/locations.ts';
import { placeStatus, type PlaceStatus } from '../../rpg/actions.ts';
import { prizeFor, UNLOCK_POSITION, usd } from '../../rpg/economy.ts';
import { findTrack } from '../../race/tracks.ts';
import { store } from '../../save/store.ts';
import { h, mount, toast, typing } from '../../ui/dom.ts';
import { drawWorldMap, legPoints, MAP_ART, MAP_H, MAP_NODES, MAP_W } from '../art/map.ts';
import { canvasTexture, carSideTexture, mipFor } from '../art/textures.ts';
import { goto } from '../flow.ts';
import { registerHook } from '../testHooks.ts';

/** Map pixels per second for the car driving between places. */
const DRIVE_SPEED = 110;
/** Width of your car on the map, px. */
const CAR_W = 36;

const PAD: Record<PlaceStatus, string> = {
  here: 'map-pad-here',
  cleared: 'map-pad-cleared',
  open: 'map-pad-open',
  locked: 'map-pad-locked',
};

/**
 * The world map, opened from the travel board. Every location sits on one
 * island, joined by a road in career order. Pick a place with the arrow keys;
 * travelling drives your car along the road to it.
 */
export class MapScene extends Phaser.Scene {
  private places: Location[] = [];
  private selected = 0;
  private here = 0;
  private cursor!: Phaser.GameObjects.Image;
  private car!: Phaser.GameObjects.Image;
  private clouds: Phaser.GameObjects.Image[] = [];
  private keys!: Record<
    'left' | 'right' | 'up' | 'down' | 'go' | 'go2' | 'back',
    Phaser.Input.Keyboard.Key
  >;
  private route: { x: number; y: number }[] | null = null;
  private routeT = 0;
  private clock = 0;

  constructor() {
    super('Map');
  }

  create(): void {
    const state = store.require();
    const cat = store.catalogue;
    this.places = [...cat.locations].sort((a, b) => a.tier - b.tier);
    this.here = Math.max(
      0,
      this.places.findIndex((l) => l.id === state.location),
    );
    this.selected = this.here;
    this.route = null;
    this.clock = 0;

    for (const [key, [w, ht, draw]] of Object.entries(MAP_ART))
      canvasTexture(this, key, w, ht, draw);
    const names = Object.fromEntries(this.places.map((l) => [l.id, l.name]));
    canvasTexture(this, 'map-world', MAP_W, MAP_H, (c) => drawWorldMap(c, names));
    this.add.image(0, 0, 'map-world').setOrigin(0, 0);

    // The road: bright up to every open place, faint dots beyond.
    const road = this.add.graphics();
    for (let leg = 0; leg < this.places.length - 1; leg++) {
      const open = placeStatus(cat, state, this.places[leg + 1]!.id) !== 'locked';
      legPoints(leg).forEach((p, i) => {
        if (i % 3) return;
        road.fillStyle(0x141826, open ? 0.9 : 0.5);
        road.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
        road.fillStyle(open ? 0xf6e7b8 : 0xa89e86, open ? 1 : 0.7);
        road.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      });
    }

    // Names sit in the page overlay, not the canvas: at the game's 384 px
    // resolution small text blurs to grey.
    const labels: HTMLElement[] = [];
    for (const loc of this.places) {
      const n = MAP_NODES[loc.id];
      if (!n) continue;
      const st = placeStatus(cat, state, loc.id);
      const status = st === 'locked' ? 'map-pad-locked' : PAD[st];
      this.add.image(n.x, n.y, status).setDepth(5);
      if (st === 'cleared')
        this.add
          .image(n.x + 6, n.y - 2, 'map-flag')
          .setOrigin(0, 1)
          .setDepth(6);
      if (st === 'locked') this.add.image(n.x, n.y - 6, 'map-lock').setDepth(6);
      labels.push(
        h(
          'span',
          {
            class: 'map-name',
            style: `left:${((n.x / MAP_W) * 100).toFixed(2)}%;top:${(((n.y + 6) / MAP_H) * 100).toFixed(2)}%`,
          },
          loc.name,
        ),
      );
    }
    mount('map-names', h('div', { class: 'map-names', 'aria-hidden': 'true' }, labels));

    // Your own car sits on the place you are at.
    const myCar = findCar(cat, state.carId);
    const side = myCar ? carSideTexture(this, myCar.game.body, myCar.game.color) : 'map-pad-here';
    const start = MAP_NODES[state.location] ?? { x: 0, y: 0 };
    this.car = this.add
      .image(start.x, start.y - 2, mipFor(this, side, CAR_W))
      .setOrigin(0.5, 1)
      .setDisplaySize(CAR_W, Math.round((CAR_W * 30) / 84))
      .setDepth(10);

    this.cursor = this.add.image(0, 0, 'map-cursor').setOrigin(0.5, 1).setDepth(12);

    this.clouds = [0, 1, 2].map((i) =>
      this.add
        .image(60 + i * 140, 20 + i * 52, 'map-cloud')
        .setDepth(20)
        .setAlpha(0.75),
    );

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT, false),
      right: kb.addKey(K.RIGHT, false),
      up: kb.addKey(K.UP, false),
      down: kb.addKey(K.DOWN, false),
      go: kb.addKey(K.ENTER, false),
      go2: kb.addKey(K.E, false),
      back: kb.addKey(K.ESC, false),
    };

    this.showCard();
    registerHook('map', {
      snapshot: () => ({
        scene: 'map',
        selected: this.places[this.selected]?.id ?? null,
        driving: !!this.route,
        places: this.places.map((l) => ({
          id: l.id,
          status: placeStatus(cat, store.require(), l.id),
        })),
      }),
    });
    this.events.once('shutdown', () => registerHook('map', null));
  }

  private select(i: number): void {
    if (this.route) return;
    const next = Math.max(0, Math.min(this.places.length - 1, i));
    if (next === this.selected) return;
    this.selected = next;
    this.showCard();
  }

  /** The card for the selected place: what it is, and the way there. */
  private showCard(): void {
    const state = store.require();
    const cat = store.catalogue;
    const loc = this.places[this.selected]!;
    const st = placeStatus(cat, state, loc.id);
    const prev = this.places[this.selected - 1];
    const best = state.bestFinish[loc.id];
    const poor = state.money < loc.travelCostUsd;
    const go = h(
      'button',
      {
        class: 'primary',
        disabled: st === 'here' || st === 'locked' || poor,
        onclick: () => this.travel(),
      },
      st === 'here'
        ? 'You are here'
        : st === 'locked'
          ? 'Locked'
          : poor
            ? 'Cannot afford'
            : `Travel (${usd(loc.travelCostUsd)})`,
    );
    const status =
      st === 'locked'
        ? `Locked: finish top ${UNLOCK_POSITION} at ${prev?.name ?? 'the previous location'}`
        : best
          ? `Best finish: P${best}`
          : 'Not raced yet';
    mount(
      'map',
      h(
        'section',
        {
          class: `map-card panel interactive ${st}`,
          role: 'dialog',
          'aria-label': 'Travel map',
          'data-location': loc.id,
        },
        h(
          'div',
          { class: 'map-card-main' },
          h('h2', {}, `${loc.tier}. ${loc.name}`),
          h(
            'div',
            { class: 'muted' },
            `${findTrack(loc.trackId).name} · Win pays ${usd(prizeFor(1, loc.prizeMult))}`,
          ),
          h('div', {}, loc.blurb),
          h('div', { class: 'muted', 'data-testid': 'place-status' }, status),
        ),
        h(
          'div',
          { class: 'map-card-side' },
          go,
          h('span', { class: 'muted' }, `You have ${usd(state.money)}`),
        ),
      ),
      h('div', { class: 'chip map-title' }, 'World map'),
      h('div', { class: 'chip map-keys' }, '← → choose · Enter travel · Esc back to town'),
    );
  }

  private travel(): void {
    if (this.route) return;
    const from = this.here;
    const to = this.selected;
    const loc = this.places[to]!;
    const r = store.dispatch({ type: 'travel', locationId: loc.id });
    if (!r.ok) {
      toast(r.error.message);
      return;
    }
    // Drive the road leg by leg, backwards if heading to an earlier place.
    const pts: { x: number; y: number }[] = [];
    const step = to > from ? 1 : -1;
    for (let i = from; i !== to; i += step) {
      const leg = legPoints(step > 0 ? i : i - 1);
      pts.push(...(step > 0 ? leg : [...leg].reverse()));
    }
    this.route = pts;
    this.routeT = 0;
    mount('map', h('div', { class: 'chip map-title' }, `On the road to ${loc.name}…`));
  }

  override update(_t: number, deltaMs: number): void {
    const dt = Math.min(0.1, deltaMs / 1000);
    this.clock += dt;

    this.clouds.forEach((c, i) => {
      c.x = Math.round(((this.clock * (3 + i) + i * 150) % (MAP_W + 80)) - 40);
    });

    if (this.route) {
      this.routeT += DRIVE_SPEED * dt;
      const pts = this.route;
      // Points are about 2 px apart.
      const i = Math.min(pts.length - 1, Math.floor(this.routeT / 2));
      const p = pts[i]!;
      const ahead = pts[Math.min(pts.length - 1, i + 3)]!;
      this.car.setFlipX(ahead.x < p.x - 0.1);
      this.car.setPosition(
        Math.round(p.x),
        Math.round(p.y - 2 - (Math.floor(this.clock * 12) % 2)),
      );
      this.cursor.setVisible(false);
      if (i >= pts.length - 1) {
        this.route = null;
        toast(`Welcome to ${this.places[this.selected]!.name}`);
        goto('Town');
      }
      return;
    }

    const n = MAP_NODES[this.places[this.selected]!.id];
    if (n)
      this.cursor
        .setVisible(true)
        .setPosition(n.x, n.y - 18 - Math.round(Math.abs(Math.sin(this.clock * 5)) * 3));

    if (typing()) return;
    const down = (k: Phaser.Input.Keyboard.Key) => Phaser.Input.Keyboard.JustDown(k);
    if (down(this.keys.right) || down(this.keys.up)) this.select(this.selected + 1);
    if (down(this.keys.left) || down(this.keys.down)) this.select(this.selected - 1);
    if (down(this.keys.go) || down(this.keys.go2)) {
      const btn = document.querySelector<HTMLButtonElement>('.map-card button.primary');
      if (btn && !btn.disabled) this.travel();
    }
    if (down(this.keys.back)) goto('Town', { from: 'travel' });
  }
}

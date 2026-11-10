import Phaser from 'phaser';
import { findCar } from '../../data/catalogue.ts';
import { findLocation, type Building } from '../../data/locations.ts';
import { findTrack } from '../../race/tracks.ts';
import { store } from '../../save/store.ts';
import { clear, h, mount, typing } from '../../ui/dom.ts';
import { mountTownHud } from '../../ui/hud.ts';
import { openTravel } from '../../ui/travel.ts';
import { PLAYER_LOOK } from '../art/people.ts';
import { LOOKS } from '../art/race.ts';
import {
  carSideTexture,
  generateLookTextures,
  generateTownTextures,
  localTextures,
  personTextures,
} from '../art/textures.ts';
import { goto } from '../flow.ts';
import { registerHook } from '../testHooks.ts';
import { Walker } from '../walker.ts';

export const GROUND_Y = 176;
const INTERACT_RANGE = 26;
const SEA_Y = 124;

export class TownScene extends Phaser.Scene {
  private walker!: Walker;
  private near: Building | null = null;
  private interactKeys: Phaser.Input.Keyboard.Key[] = [];
  private buildings: Building[] = [];
  private mid!: Phaser.GameObjects.TileSprite;
  private clouds!: Phaser.GameObjects.TileSprite;
  private arrow!: Phaser.GameObjects.Image;
  private gulls: Phaser.GameObjects.Image[] = [];
  private clock = 0;
  private busy = false;
  private trackName = '';

  constructor() {
    super('Town');
  }

  create(data: { from?: string } = {}): void {
    const state = store.require();
    const loc = findLocation(state.location);
    const look = loc.look;
    const seaside = look === 'dusk';
    const dark = look === 'dusk' || look === 'night';
    this.buildings = loc.buildings;
    this.trackName = findTrack(loc.trackId).name;
    this.near = null;
    this.clock = 0;
    this.busy = false;
    this.gulls = [];
    generateTownTextures(this);
    generateLookTextures(this, look);
    personTextures(this, 'player', PLAYER_LOOK, 'player');
    for (const b of loc.buildings)
      if (b.sign && b.room) localTextures(this, b.art, b.room, b.sign, b.kind === 'bar');

    const W = loc.width;
    this.cameras.main.setBounds(0, 0, W, 216);

    // Backdrop: sky, sun or moon, clouds, hills, then sea or land behind the street.
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor>(o: T) =>
      o.setScrollFactor(0);
    fixed(this.add.image(0, 0, `town-sky-${look}`).setOrigin(0, 0));
    fixed(this.add.image(292, seaside ? 108 : 58, `bg-body-${look}`));
    this.clouds = fixed(this.add.tileSprite(0, 16, 384, 46, `bg-clouds-${look}`).setOrigin(0, 0));
    if (seaside) {
      fixed(this.add.image(0, SEA_Y - 38, 'town-headland').setOrigin(0, 0));
      this.mid = fixed(this.add.tileSprite(0, SEA_Y, 384, 64, 'town-sea').setOrigin(0, 0));
      const glint = fixed(this.add.image(292, SEA_Y, 'town-glint').setOrigin(0.5, 0).setAlpha(0.8));
      this.tweens.add({
        targets: glint,
        alpha: 0.45,
        scaleX: 1.15,
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
      const beacon = fixed(
        this.add
          .image(320, SEA_Y - 32, 'fx-smoke')
          .setTint(0xfff0b0)
          .setScale(0.7),
      );
      this.tweens.add({ targets: beacon, alpha: 0.1, duration: 1100, yoyo: true, repeat: -1 });
      for (const [x, y, flip] of [
        [90, 150, false],
        [210, 140, true],
      ] as [number, number, boolean][]) {
        const boat = this.add
          .image(x, y, 'sailboat')
          .setScrollFactor(0.08)
          .setFlipX(flip)
          .setScale(y > 145 ? 0.8 : 0.5);
        this.tweens.add({
          targets: boat,
          y: y + 1.5,
          angle: flip ? -2 : 2,
          duration: 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      }
      for (let i = 0; i < 3; i++)
        this.gulls.push(fixed(this.add.image(60 + i * 130, 40 + i * 14, 'gull-0')).setAlpha(0.9));
      this.add
        .tileSprite(0, GROUND_Y - 22, W, 16, 'town-rail')
        .setOrigin(0, 0)
        .setDepth(4);
    } else {
      fixed(
        this.add.tileSprite(0, SEA_Y - 42, 384, 44, `bg-mountains-${look}`).setOrigin(0, 0),
      ).setName('hills');
      if (LOOKS[look].city)
        fixed(this.add.tileSprite(0, SEA_Y - 44, 384, 46, 'bg-city').setOrigin(0, 0));
      this.mid = fixed(this.add.tileSprite(0, SEA_Y, 384, 64, `town-mid-${look}`).setOrigin(0, 0));
    }
    this.add
      .tileSprite(0, GROUND_Y - 6, W, 48, 'town-ground')
      .setOrigin(0, 0)
      .setDepth(5);

    for (const b of loc.buildings) {
      this.add
        .image(b.x, GROUND_Y + 1, b.art)
        .setOrigin(0.5, 1)
        .setDepth(b.kind === 'gate' ? 60 : 10);
    }

    // Lamps stand between the doors, never in front of one.
    const xs = loc.buildings.map((b) => b.x).sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) {
      const x = Math.round((xs[i]! + xs[i + 1]!) / 2);
      this.add
        .image(x, GROUND_Y + 1, 'town-lamp')
        .setOrigin(0.5, 1)
        .setDepth(20);
      if (dark)
        this.add
          .image(x, GROUND_Y + 6, 'town-lightpool')
          .setDepth(6)
          .setBlendMode(Phaser.BlendModes.ADD);
    }
    if (seaside) {
      for (const x of [585, 858, 1128])
        this.add.image(x, GROUND_Y, 'palm').setOrigin(0.5, 1).setDepth(8);
      this.add.image(1120, GROUND_Y, 'town-bench').setOrigin(0.5, 1).setDepth(12);
      this.add.image(346, GROUND_Y, 'town-crate').setOrigin(0.5, 1).setDepth(12);
      this.add
        .image(586, GROUND_Y + 14, carSideTexture(this, 'coupe', '#1c1c24'))
        .setOrigin(0.5, 1)
        .setDepth(30)
        .setFlipX(true);
      this.add
        .image(848, GROUND_Y + 14, carSideTexture(this, 'hatch', '#2e8b57'))
        .setOrigin(0.5, 1)
        .setDepth(30);
    }

    // Your car is parked outside the garage.
    const garage = loc.buildings.find((b) => b.kind === 'garage');
    const car = findCar(store.catalogue, state.carId);
    if (car && garage)
      this.add
        .image(garage.x + 134, GROUND_Y + 14, carSideTexture(this, car.game.body, car.game.color))
        .setOrigin(0.5, 1)
        .setDepth(30);

    this.arrow = this.add.image(0, 0, 'town-arrow').setDepth(70).setVisible(false);

    const start =
      loc.buildings.find((b) => b.id === data.from) ??
      (data.from === 'race' ? loc.buildings.find((b) => b.kind === 'gate') : undefined);
    this.walker = new Walker(this, 'player', start?.x ?? 100, GROUND_Y + 6, 12, W - 12);
    this.cameras.main.startFollow(this.walker.sprite, true, 0.15, 1, 0, 60);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.interactKeys = [
      kb.addKey(K.E, false),
      kb.addKey(K.ENTER, false),
      kb.addKey(K.SPACE, false),
      kb.addKey(K.UP, false),
    ];

    const unsub = mountTownHud(loc.name);
    registerHook('town', {
      snapshot: () => ({
        scene: 'town',
        location: loc.id,
        playerX: Math.round(this.walker.x),
        near: this.near?.id ?? null,
      }),
      setPlayerX: (x: number) => {
        this.walker.x = x;
      },
      buildings: () => loc.buildings.map((b) => ({ id: b.id, kind: b.kind, x: b.x, name: b.name })),
    });
    this.events.once('shutdown', () => {
      unsub();
      registerHook('town', null);
    });
  }

  private promptFor(b: Building): string {
    if (b.kind === 'gate') return `Press E to race the ${this.trackName}`;
    if (b.kind === 'travel') return 'Press E to read the travel board';
    return `Press E to enter ${b.name}`;
  }

  override update(_t: number, deltaMs: number): void {
    const dt = Math.min(0.1, deltaMs / 1000);
    this.clock += dt;
    if (this.busy) return;
    this.walker.update(dt);
    const scroll = this.cameras.main.scrollX;
    this.mid.tilePositionX = scroll * 0.1 + (this.gulls.length ? this.clock * 4 : 0);
    this.clouds.tilePositionX = scroll * 0.04 + this.clock * 2;
    const hills = this.children.getByName('hills') as Phaser.GameObjects.TileSprite | null;
    if (hills) hills.tilePositionX = scroll * 0.05;
    this.gulls.forEach((g, i) => {
      g.x = ((this.clock * (14 + i * 5) + i * 140) % 440) - 28;
      g.y = 38 + i * 14 + Math.sin(this.clock * 1.3 + i) * 5;
      g.setTexture(Math.floor(this.clock * 4 + i) % 2 ? 'gull-1' : 'gull-0');
    });

    const near = this.buildings.find((b) => Math.abs(b.x - this.walker.x) < INTERACT_RANGE) ?? null;
    if (near !== this.near) {
      this.near = near;
      if (near)
        mount(
          'prompt',
          h(
            'div',
            { class: 'prompt', role: 'status', 'data-testid': 'interact-prompt' },
            this.promptFor(near),
          ),
        );
      else clear('prompt');
    }
    this.arrow.setVisible(!!near);
    if (near)
      this.arrow.setPosition(near.x, GROUND_Y - 52 + Math.round(Math.sin(this.clock * 6) * 2));
    if (near && !typing() && this.interactKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      if (near.kind === 'gate') goto('Race');
      else if (near.kind === 'travel') {
        this.busy = true;
        this.walker.frozen = true;
        clear('prompt');
        openTravel(
          () => {
            this.busy = false;
            this.walker.frozen = false;
            this.near = null;
            for (const k of this.interactKeys) k.reset();
          },
          () => goto('Town'),
        );
      } else goto('Interior', { buildingId: near.id });
    }
  }
}

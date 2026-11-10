import Phaser from 'phaser';
import { findCar } from '../../data/catalogue.ts';
import { findLocation, type Building } from '../../data/locations.ts';
import { store } from '../../save/store.ts';
import { clear, h, mount, typing } from '../../ui/dom.ts';
import { mountTownHud } from '../../ui/hud.ts';
import { PLAYER_LOOK } from '../art/people.ts';
import { carSideTexture, generateTownTextures, personTextures } from '../art/textures.ts';
import { goto } from '../flow.ts';
import { registerHook } from '../testHooks.ts';
import { Walker } from '../walker.ts';

export const GROUND_Y = 176;
const INTERACT_RANGE = 26;
const SEA_Y = 124;

const BUILDING_TEX: Record<Building['kind'], string> = {
  garage: 'bld-garage',
  shop: 'bld-shop',
  lounge: 'bld-lounge',
  trailer: 'bld-trailer',
  gate: 'bld-gate',
};

export class TownScene extends Phaser.Scene {
  private walker!: Walker;
  private near: Building | null = null;
  private interactKeys: Phaser.Input.Keyboard.Key[] = [];
  private buildings: Building[] = [];
  private sea!: Phaser.GameObjects.TileSprite;
  private clouds!: Phaser.GameObjects.TileSprite;
  private arrow!: Phaser.GameObjects.Image;
  private gulls: Phaser.GameObjects.Image[] = [];
  private clock = 0;

  constructor() {
    super('Town');
  }

  create(data: { from?: string } = {}): void {
    const state = store.require();
    const loc = findLocation(state.location);
    this.buildings = loc.buildings;
    this.near = null;
    this.clock = 0;
    this.gulls = [];
    generateTownTextures(this);
    personTextures(this, 'player', PLAYER_LOOK, 'player');

    const W = loc.width;
    this.cameras.main.setBounds(0, 0, W, 216);

    // Backdrop: dusk sky, sun, clouds, headland, sea with a sun glint.
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor>(o: T) =>
      o.setScrollFactor(0);
    fixed(this.add.image(0, 0, 'town-sky').setOrigin(0, 0));
    fixed(this.add.image(292, 108, 'bg-sun'));
    this.clouds = fixed(this.add.tileSprite(0, 16, 384, 46, 'bg-clouds').setOrigin(0, 0));
    fixed(this.add.image(0, SEA_Y - 38, 'town-headland').setOrigin(0, 0));
    this.sea = fixed(this.add.tileSprite(0, SEA_Y, 384, 64, 'town-sea').setOrigin(0, 0));
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

    // Promenade and street.
    this.add
      .tileSprite(0, GROUND_Y - 22, W, 16, 'town-rail')
      .setOrigin(0, 0)
      .setDepth(4);
    this.add
      .tileSprite(0, GROUND_Y - 6, W, 48, 'town-ground')
      .setOrigin(0, 0)
      .setDepth(5);

    for (const b of loc.buildings) {
      this.add
        .image(b.x, GROUND_Y + 1, BUILDING_TEX[b.kind])
        .setOrigin(0.5, 1)
        .setDepth(b.kind === 'gate' ? 60 : 10);
    }
    for (const x of [585, 858, 1128])
      this.add.image(x, GROUND_Y, 'palm').setOrigin(0.5, 1).setDepth(8);
    for (const x of [600, 845])
      this.add.image(x, GROUND_Y, 'town-bench').setOrigin(0.5, 1).setDepth(12);
    this.add.image(46, GROUND_Y, 'town-tyres').setOrigin(0.5, 1).setDepth(12);
    this.add.image(346, GROUND_Y, 'town-crate').setOrigin(0.5, 1).setDepth(12);
    // Lamps sit between the doors, never in front of one.
    for (const x of [70, 300, 365, 545, 640, 800, 900, 1075, 1160, 1290]) {
      this.add
        .image(x, GROUND_Y + 1, 'town-lamp')
        .setOrigin(0.5, 1)
        .setDepth(20);
      this.add
        .image(x, GROUND_Y + 6, 'town-lightpool')
        .setDepth(6)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    // Your car outside the garage, rivals' cars by the gate.
    const car = findCar(store.catalogue, state.carId);
    if (car)
      this.add
        .image(304, GROUND_Y + 14, carSideTexture(this, car.game.body, car.game.color))
        .setOrigin(0.5, 1)
        .setDepth(30);
    this.add
      .image(586, GROUND_Y + 14, carSideTexture(this, 'coupe', '#1c1c24'))
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setFlipX(true);
    this.add
      .image(848, GROUND_Y + 14, carSideTexture(this, 'hatch', '#2e8b57'))
      .setOrigin(0.5, 1)
      .setDepth(30);

    this.arrow = this.add.image(0, 0, 'town-arrow').setDepth(70).setVisible(false);

    const start =
      loc.buildings.find((b) => b.id === data.from) ??
      (data.from === 'race' ? loc.buildings.find((b) => b.kind === 'gate') : undefined);
    this.walker = new Walker(this, 'player', start?.x ?? 70, GROUND_Y + 6, 12, W - 12);
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

  override update(_t: number, deltaMs: number): void {
    const dt = Math.min(0.1, deltaMs / 1000);
    this.clock += dt;
    this.walker.update(dt);
    const scroll = this.cameras.main.scrollX;
    this.sea.tilePositionX = scroll * 0.1 + this.clock * 4;
    this.clouds.tilePositionX = scroll * 0.04 + this.clock * 2;
    this.gulls.forEach((g, i) => {
      g.x = ((this.clock * (14 + i * 5) + i * 140) % 440) - 28;
      g.y = 38 + i * 14 + Math.sin(this.clock * 1.3 + i) * 5;
      g.setTexture(Math.floor(this.clock * 4 + i) % 2 ? 'gull-1' : 'gull-0');
    });

    const near = this.buildings.find((b) => Math.abs(b.x - this.walker.x) < INTERACT_RANGE) ?? null;
    if (near !== this.near) {
      this.near = near;
      if (near) {
        const verb = near.kind === 'gate' ? `race the Harbour Loop` : `enter ${near.name}`;
        mount(
          'prompt',
          h(
            'div',
            { class: 'prompt', role: 'status', 'data-testid': 'interact-prompt' },
            `Press E to ${verb}`,
          ),
        );
      } else clear('prompt');
    }
    this.arrow.setVisible(!!near);
    if (near)
      this.arrow.setPosition(near.x, GROUND_Y - 52 + Math.round(Math.sin(this.clock * 6) * 2));
    if (near && !typing() && this.interactKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      if (near.kind === 'gate') goto('Race');
      else goto('Interior', { buildingId: near.id });
    }
  }
}

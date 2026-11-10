import Phaser from 'phaser';
import { findCar } from '../../data/catalogue.ts';
import { findLocation, type Building } from '../../data/locations.ts';
import { store } from '../../save/store.ts';
import { clear, h, mount, typing } from '../../ui/dom.ts';
import { mountTownHud } from '../../ui/hud.ts';
import { goto } from '../flow.ts';
import { registerHook } from '../testHooks.ts';
import { carSideTexture, generateTownTextures, personTextures, PLAYER_LOOK } from '../textures.ts';
import { Walker } from '../walker.ts';

export const GROUND_Y = 176;
const INTERACT_RANGE = 26;

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

  constructor() {
    super('Town');
  }

  create(data: { from?: string } = {}): void {
    const state = store.require();
    const loc = findLocation(state.location);
    this.buildings = loc.buildings;
    generateTownTextures(this);
    personTextures(this, 'player', PLAYER_LOOK);

    const W = loc.width;
    this.cameras.main.setBounds(0, 0, W, 216);
    this.add.image(0, 0, 'town-sky').setOrigin(0, 0).setDisplaySize(384, 216).setScrollFactor(0);
    this.add
      .tileSprite(0, 100, 384, 40, 'town-sea')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setName('sea');
    this.add
      .tileSprite(0, 70, 384, 40, 'skyline')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(0.7)
      .setName('skyline');
    this.add.tileSprite(0, GROUND_Y - 6, W, 48, 'town-ground').setOrigin(0, 0);

    for (const b of loc.buildings) {
      const img = this.add
        .image(b.x, GROUND_Y, BUILDING_TEX[b.kind])
        .setOrigin(0.5, 1)
        .setDepth(10);
      this.add
        .text(b.x, GROUND_Y - img.height - 4, b.name, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#ffffff',
          backgroundColor: '#0b0d17cc',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(11)
        .setResolution(4);
    }
    for (let x = 60; x < W; x += 140)
      this.add.image(x, GROUND_Y, 'town-lamp').setOrigin(0.5, 1).setDepth(20);
    this.add.image(300, GROUND_Y, 'town-crate').setOrigin(0.5, 1).setDepth(21);
    this.add.image(315, GROUND_Y, 'town-crate').setOrigin(0.5, 1).setDepth(21);

    // Your car, parked outside the garage.
    const car = findCar(store.catalogue, state.carId);
    if (car)
      this.add
        .image(270, GROUND_Y + 2, carSideTexture(this, car.game.body, car.game.color))
        .setOrigin(0.5, 1)
        .setDepth(30);

    const start =
      loc.buildings.find((b) => b.id === data.from) ??
      (data.from === 'race' ? loc.buildings.find((b) => b.kind === 'gate') : undefined);
    this.walker = new Walker(this, 'player', start?.x ?? 60, GROUND_Y + 2, 12, W - 12);
    this.cameras.main.startFollow(this.walker.sprite, true, 0.15, 1);

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
    this.walker.update(dt);
    const cam = this.cameras.main;
    (this.children.getByName('sea') as Phaser.GameObjects.TileSprite).tilePositionX =
      cam.scrollX * 0.15;
    (this.children.getByName('skyline') as Phaser.GameObjects.TileSprite).tilePositionX =
      cam.scrollX * 0.3;

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
    if (near && !typing() && this.interactKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      if (near.kind === 'gate') goto('Race');
      else goto('Interior', { buildingId: near.id });
    }
  }
}

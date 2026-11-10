import Phaser from 'phaser';
import { findCar, findCharacter } from '../../data/catalogue.ts';
import { findLocation } from '../../data/locations.ts';
import { store } from '../../save/store.ts';
import { openDialogue } from '../../ui/dialogue.ts';
import { clear, h, mount, typing } from '../../ui/dom.ts';
import { mountTownHud } from '../../ui/hud.ts';
import { goto } from '../flow.ts';
import { registerHook } from '../testHooks.ts';
import { carSideTexture, generateTownTextures, personTextures, PLAYER_LOOK } from '../textures.ts';
import { Walker } from '../walker.ts';

const FLOOR_Y = 180;
const EXIT_X = 26;
const NPC_X = 262;
const RANGE = 30;

export class InteriorScene extends Phaser.Scene {
  private walker!: Walker;
  private buildingId = '';
  private characterId = '';
  private near: 'exit' | 'npc' | null = null;
  private talking = false;
  private interactKeys: Phaser.Input.Keyboard.Key[] = [];
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('Interior');
  }

  create(data: { buildingId: string; talk?: boolean }): void {
    const state = store.require();
    const loc = findLocation(state.location);
    const building = loc.buildings.find((b) => b.id === data.buildingId);
    if (!building?.characterId || !building.interior) {
      goto('Town');
      return;
    }
    const persona = findCharacter(store.catalogue, building.characterId)!;
    this.buildingId = building.id;
    this.characterId = persona.id;
    this.near = null;
    this.talking = false;
    generateTownTextures(this);
    personTextures(this, 'player', PLAYER_LOOK);
    personTextures(this, `npc-${persona.id}`, persona.look);

    const col = (s: string) => Phaser.Display.Color.HexStringToColor(s).color;
    const g = this.add.graphics();
    g.fillStyle(col(building.interior.wall)).fillRect(0, 0, 384, FLOOR_Y);
    g.fillStyle(col(building.interior.floor)).fillRect(0, FLOOR_Y, 384, 36);
    g.fillStyle(col(building.interior.accent)).fillRect(0, 40, 384, 3);
    g.fillStyle(0x111111, 0.5).fillRect(8, FLOOR_Y - 60, 36, 60);
    g.fillStyle(col(building.interior.accent)).fillRect(10, FLOOR_Y - 58, 32, 2);

    if (building.kind === 'garage') {
      g.fillStyle(0x9aa0aa)
        .fillRect(110, FLOOR_Y - 8, 120, 6)
        .fillRect(118, FLOOR_Y - 40, 6, 34)
        .fillRect(216, FLOOR_Y - 40, 6, 34);
      const car = findCar(store.catalogue, state.carId);
      if (car)
        this.add
          .image(170, FLOOR_Y - 40, carSideTexture(this, car.game.body, car.game.color))
          .setOrigin(0.5, 1)
          .setScale(1.3);
      this.add.image(320, FLOOR_Y, 'interior-bench').setOrigin(0.5, 1);
    } else if (building.kind === 'shop') {
      g.fillStyle(0x6b3f25).fillRect(200, FLOOR_Y - 34, 150, 34);
      g.fillStyle(0x3b2a1e);
      for (let y = 60; y < 140; y += 26) g.fillRect(60, y, 120, 4);
      g.fillStyle(0x1b1b22);
      for (let x = 66; x < 176; x += 16) g.fillCircle(x, 54, 6).fillCircle(x, 80, 6);
      g.fillStyle(0xf2c230).fillCircle(330, FLOOR_Y - 38, 4);
    } else if (building.kind === 'lounge') {
      g.fillStyle(0x7b2cff).fillRect(150, 60, 180, 50);
      g.fillStyle(0xc6ff2e).fillRect(160, 70, 160, 6).fillRect(160, 90, 100, 6);
      g.fillStyle(0x4a2c1e).fillRect(200, FLOOR_Y - 26, 120, 8);
    } else if (building.kind === 'trailer') {
      g.fillStyle(0x3b4c63).fillRect(150, 50, 90, 50);
      g.fillStyle(0xf2f2f2)
        .fillRect(155, 55, 80, 2)
        .fillRect(155, 70, 60, 2)
        .fillRect(155, 85, 70, 2);
      g.fillStyle(0x5a4a3a).fillRect(220, FLOOR_Y - 30, 110, 6);
    }

    this.add
      .image(NPC_X, FLOOR_Y, `npc-${persona.id}-0`)
      .setOrigin(0.5, 1)
      .setScale(1.6)
      .setFlipX(true)
      .setDepth(40);
    this.add
      .text(NPC_X, FLOOR_Y - 50, persona.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#0b0d17cc',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(41);

    this.walker = new Walker(this, 'player', 48, FLOOR_Y, 14, 370);
    this.walker.sprite.setScale(1.6);
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.interactKeys = [
      kb.addKey(K.E, false),
      kb.addKey(K.ENTER, false),
      kb.addKey(K.SPACE, false),
      kb.addKey(K.UP, false),
    ];
    this.escKey = kb.addKey(K.ESC, false);

    const unsub = mountTownHud(building.name);
    mount(
      'room',
      h(
        'h2',
        {
          class: 'chip',
          style: 'position:absolute;top:2.6em;left:0.6em;margin:0;font-size:0.9em',
          'data-testid': 'room-name',
        },
        `${persona.name}, ${persona.roleTitle}`,
      ),
    );
    registerHook('town', {
      snapshot: () => ({
        scene: 'interior',
        buildingId: this.buildingId,
        characterId: this.characterId,
        playerX: Math.round(this.walker.x),
        near: this.near,
        talking: this.talking,
      }),
      setPlayerX: (x: number) => {
        this.walker.x = x;
      },
    });
    this.events.once('shutdown', () => {
      unsub();
      registerHook('town', null);
    });
    if (data.talk) this.talk();
  }

  private talk(): void {
    this.talking = true;
    this.walker.frozen = true;
    clear('prompt');
    this.near = null;
    openDialogue(this.characterId, () => {
      this.talking = false;
      this.walker.frozen = false;
      // Keys pressed while typing must not trigger the room afterwards.
      for (const k of [...this.interactKeys, this.escKey]) k.reset();
    });
  }

  override update(_t: number, deltaMs: number): void {
    if (this.talking) return;
    this.walker.update(Math.min(0.1, deltaMs / 1000));
    if (Phaser.Input.Keyboard.JustDown(this.escKey) && !typing()) {
      goto('Town', { from: this.buildingId });
      return;
    }
    const x = this.walker.x;
    const near = Math.abs(x - NPC_X) < RANGE + 12 ? 'npc' : x < EXIT_X + RANGE ? 'exit' : null;
    if (near !== this.near) {
      this.near = near;
      const persona = findCharacter(store.catalogue, this.characterId)!;
      if (near)
        mount(
          'prompt',
          h(
            'div',
            { class: 'prompt', role: 'status', 'data-testid': 'interact-prompt' },
            near === 'npc' ? `Press E to talk to ${persona.name}` : 'Press E to go back outside',
          ),
        );
      else clear('prompt');
    }
    if (near && !typing() && this.interactKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      if (near === 'exit') goto('Town', { from: this.buildingId });
      else this.talk();
    }
  }
}

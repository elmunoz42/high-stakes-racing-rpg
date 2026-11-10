import Phaser from 'phaser';
import { findCar, findCharacter } from '../../data/catalogue.ts';
import { findLocation } from '../../data/locations.ts';
import { store } from '../../save/store.ts';
import { openDialogue } from '../../ui/dialogue.ts';
import { clear, h, mount, typing } from '../../ui/dom.ts';
import { mountTownHud } from '../../ui/hud.ts';
import { PLAYER_LOOK, styleForRole } from '../art/people.ts';
import { carSideTexture, generateTownTextures, personTextures } from '../art/textures.ts';
import { goto } from '../flow.ts';
import { registerHook } from '../testHooks.ts';
import { Walker } from '../walker.ts';

const FLOOR_Y = 184;
const EXIT_X = 28;
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
    if (!building?.characterId) {
      goto('Town');
      return;
    }
    const persona = findCharacter(store.catalogue, building.characterId)!;
    this.buildingId = building.id;
    this.characterId = persona.id;
    this.near = null;
    this.talking = false;
    generateTownTextures(this);
    personTextures(this, 'player', PLAYER_LOOK, 'player');
    personTextures(this, `npc-${persona.id}`, persona.look, styleForRole(persona.role));

    this.add.image(0, 0, `room-${building.kind}`).setOrigin(0, 0);
    if (building.kind === 'garage') {
      const car = findCar(store.catalogue, state.carId);
      if (car)
        this.add
          .image(171, 139, carSideTexture(this, car.game.body, car.game.color))
          .setOrigin(0.5, 1)
          .setScale(1.45);
    }

    const npc = this.add
      .image(NPC_X, FLOOR_Y, `npc-${persona.id}-0`)
      .setOrigin(0.5, 1)
      .setScale(2)
      .setFlipX(true)
      .setDepth(40);
    this.tweens.add({
      targets: npc,
      scaleY: 2.04,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.add
      .text(NPC_X, FLOOR_Y - 76, persona.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#0b0d17cc',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(41);

    this.walker = new Walker(this, 'player', 60, FLOOR_Y, 16, 368, 2);
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

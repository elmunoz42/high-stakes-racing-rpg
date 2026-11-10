import Phaser from 'phaser';
import { findCar, findCharacter } from '../../data/catalogue.ts';
import { findLocation } from '../../data/locations.ts';
import { findRacer } from '../../data/rivals.ts';
import { store } from '../../save/store.ts';
import { openDialogue } from '../../ui/dialogue.ts';
import { clear, h, mount, typing } from '../../ui/dom.ts';
import { mountTownHud } from '../../ui/hud.ts';
import { PLAYER_LOOK, styleForRole } from '../art/people.ts';
import {
  carSideTexture,
  generateTownTextures,
  localTextures,
  personTextures,
} from '../art/textures.ts';
import { goto } from '../flow.ts';
import { registerHook } from '../testHooks.ts';
import { Walker } from '../walker.ts';

const FLOOR_Y = 184;
const EXIT_X = 28;
const SOLO_X = 262;
const RANGE = 30;

interface Npc {
  id: string;
  x: number;
  name: string;
}

/** Inside a building: one person behind a counter, or a bar full of racers. */
export class InteriorScene extends Phaser.Scene {
  private walker!: Walker;
  private buildingId = '';
  private npcs: Npc[] = [];
  private near: 'exit' | Npc | null = null;
  private talking = false;
  private interactKeys: Phaser.Input.Keyboard.Key[] = [];
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('Interior');
  }

  create(data: { buildingId: string; talk?: boolean | string }): void {
    const state = store.require();
    const loc = findLocation(state.location);
    const building = loc.buildings.find((b) => b.id === data.buildingId);
    const ids = building?.characterIds ?? (building?.characterId ? [building.characterId] : []);
    if (!building || !ids.length) {
      goto('Town');
      return;
    }
    const crowd = ids.length > 1;
    this.buildingId = building.id;
    this.near = null;
    this.talking = false;
    generateTownTextures(this);
    personTextures(this, 'player', PLAYER_LOOK, 'player');
    if (building.sign && building.room)
      localTextures(this, building.art, building.room, building.sign, building.kind === 'bar');
    this.add.image(0, 0, building.room ?? 'room-garage').setOrigin(0, 0);
    if (building.kind === 'garage') {
      const car = findCar(store.catalogue, state.carId);
      if (car)
        this.add
          .image(171, 139, carSideTexture(this, car.game.body, car.game.color))
          .setOrigin(0.5, 1)
          .setScale(1.45);
    }

    this.npcs = ids.flatMap((id, i) => {
      const persona = findCharacter(store.catalogue, id);
      if (!persona) return [];
      const x = crowd ? Math.round(104 + (i * (344 - 104)) / (ids.length - 1)) : SOLO_X;
      personTextures(this, `npc-${id}`, persona.look, styleForRole(persona.role));
      const sprite = this.add
        .image(x, FLOOR_Y, `npc-${id}-0`)
        .setOrigin(0.5, 1)
        .setScale(2)
        .setFlipX(i % 2 === 0)
        .setDepth(40);
      this.tweens.add({
        targets: sprite,
        scaleY: 2.04,
        duration: 800 + i * 70,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      const name = findRacer(id)?.short ?? persona.name;
      this.add
        .text(x, FLOOR_Y - 76, name, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#ffffff',
          backgroundColor: '#0b0d17cc',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setResolution(4)
        .setDepth(41);
      return [{ id, x, name: persona.name }];
    });

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
    const solo = crowd ? null : findCharacter(store.catalogue, ids[0]!);
    mount(
      'room',
      h(
        'h2',
        {
          class: 'chip',
          style: 'position:absolute;top:2.6em;left:0.6em;margin:0;font-size:0.9em',
          'data-testid': 'room-name',
        },
        solo
          ? `${solo.name}, ${solo.roleTitle}`
          : `${building.name}: ${this.npcs.map((n) => n.name).join(', ')}`,
      ),
    );
    registerHook('town', {
      snapshot: () => ({
        scene: 'interior',
        buildingId: this.buildingId,
        characterId: this.npcs[0]?.id,
        npcs: this.npcs.map((n) => ({ id: n.id, x: n.x })),
        playerX: Math.round(this.walker.x),
        near: this.near === 'exit' ? 'exit' : this.near ? (crowd ? this.near.id : 'npc') : null,
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
    if (data.talk) this.talk(typeof data.talk === 'string' ? data.talk : this.npcs[0]!.id);
  }

  private talk(characterId: string): void {
    this.talking = true;
    this.walker.frozen = true;
    clear('prompt');
    this.near = null;
    openDialogue(characterId, () => {
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
    const reach = this.npcs.length > 1 ? 20 : RANGE + 12;
    const npc = this.npcs
      .filter((n) => Math.abs(x - n.x) < reach)
      .sort((a, b) => Math.abs(x - a.x) - Math.abs(x - b.x))[0];
    const near = npc ?? (x < EXIT_X + RANGE ? 'exit' : null);
    if (near !== this.near) {
      this.near = near;
      if (near)
        mount(
          'prompt',
          h(
            'div',
            { class: 'prompt', role: 'status', 'data-testid': 'interact-prompt' },
            near === 'exit' ? 'Press E to go back outside' : `Press E to talk to ${near.name}`,
          ),
        );
      else clear('prompt');
    }
    if (near && !typing() && this.interactKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      if (near === 'exit') goto('Town', { from: this.buildingId });
      else this.talk(near.id);
    }
  }
}

import Phaser from 'phaser';
import { store } from '../../save/store.ts';
import { h, mount } from '../../ui/dom.ts';
import { goto } from '../flow.ts';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const g = this.add.graphics();
    for (let i = 0; i < 216; i += 4) {
      const t = i / 216;
      g.fillStyle(Phaser.Display.Color.GetColor(20 + 120 * t, 10 + 30 * t, 60 + 40 * (1 - t)), 1);
      g.fillRect(0, i, 384, 4);
    }
    g.fillStyle(0xffcc33).fillCircle(192, 150, 46);
    g.fillStyle(0x0b0d17);
    for (let y = 120; y < 200; y += 9) g.fillRect(140, y, 104, 3);
    g.fillStyle(0x2b2d36).fillTriangle(0, 216, 192, 140, 384, 216);
    g.fillStyle(0xd7263d)
      .fillTriangle(150, 216, 192, 140, 160, 216)
      .fillTriangle(234, 216, 192, 140, 224, 216);
    this.add
      .text(192, 44, 'RACING RPG', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#ffcc33',
        stroke: '#1b1300',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setResolution(4);
    this.add
      .text(192, 70, 'working title', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#f4efe2',
      })
      .setOrigin(0.5)
      .setResolution(4);

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
    mount('title', h('div', { class: 'layer title-screen' }, menu));
    (cont ?? newCareer).focus();
  }
}

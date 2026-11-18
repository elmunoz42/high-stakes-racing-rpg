import Phaser from 'phaser';
import { fitCamera } from '../view.ts';
import { goto } from '../flow.ts';
import { generateRaceTextures } from '../art/textures.ts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    fitCamera(this);
    generateRaceTextures(this);
    goto('Title');
  }
}

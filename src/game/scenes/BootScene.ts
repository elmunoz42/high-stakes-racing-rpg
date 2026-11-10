import Phaser from 'phaser';
import { goto } from '../flow.ts';
import { generateRaceTextures } from '../textures.ts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateRaceTextures(this);
    goto('Title');
  }
}

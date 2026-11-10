import Phaser from 'phaser';
import { TitleScene } from './game/scenes/TitleScene.ts';

export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  backgroundColor: '#0b0d17',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TitleScene],
});

export default game;

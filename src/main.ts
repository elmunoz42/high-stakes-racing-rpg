import Phaser from 'phaser';
import { initFlow } from './game/flow.ts';
import { BootScene } from './game/scenes/BootScene.ts';
import { CarPickScene } from './game/scenes/CarPickScene.ts';
import { InteriorScene } from './game/scenes/InteriorScene.ts';
import { TownScene } from './game/scenes/TownScene.ts';
import { RaceScene } from './game/scenes/RaceScene.ts';
import { MapScene } from './game/scenes/MapScene.ts';
import { ResultsScene } from './game/scenes/ResultsScene.ts';
import { TitleScene } from './game/scenes/TitleScene.ts';
import { installTestHooks } from './game/testHooks.ts';
import { SCREEN_H, SCREEN_W } from './race/projection.ts';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN_W,
  height: SCREEN_H,
  pixelArt: true,
  // Keep every corner of every filled shape. By default Phaser drops a corner
  // that is within a pixel of the previous one, which turns the one-pixel-tall
  // ground strips near the horizon into slivers that let the backing through.
  render: { pathDetailThreshold: 0 },
  backgroundColor: '#0b0d17',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [
    BootScene,
    TitleScene,
    CarPickScene,
    TownScene,
    InteriorScene,
    RaceScene,
    ResultsScene,
    MapScene,
  ],
});

initFlow(game);
installTestHooks();

export default game;

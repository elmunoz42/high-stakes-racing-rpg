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
import { CANVAS_H, CANVAS_W, fitCamera } from './game/view.ts';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CANVAS_W,
  height: CANVAS_H,
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

// Every scene draws at 2x: zoom its camera as it is created.
game.events.once(Phaser.Core.Events.READY, () => {
  for (const scene of game.scene.scenes)
    scene.sys.events.on(Phaser.Scenes.Events.CREATE, () => {
      const cam = scene.cameras.main;
      const followed = (cam as unknown as { _follow: unknown })._follow;
      if (followed) cam.setZoom(2);
      else fitCamera(scene);
    });
});

initFlow(game);
installTestHooks();

export default game;

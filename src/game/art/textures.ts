import type Phaser from 'phaser';
import { type Body, CAR_H, CAR_W, SIDE_H, SIDE_W, drawCarRear, drawCarSide } from './cars.ts';
import type { Ctx } from './pixel.ts';
import { BACKDROPS, SCENERY } from './race.ts';

/** Creates a canvas texture once; later calls with the same key are free. */
export function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (c: Ctx) => void,
): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  tex.refresh();
  return key;
}

/** Steering frame (-2..2) for a yaw value from the simulation. */
export function steerFrame(yaw: number): number {
  const a = Math.abs(yaw);
  return Math.sign(yaw) * (a < 0.2 ? 0 : a < 0.72 ? 1 : 2);
}

export function carRearTexture(
  scene: Phaser.Scene,
  body: Body,
  color: string,
  frame: number,
  braking: boolean,
): string {
  const key = `car-${body}-${color.slice(1)}-${frame}-${braking ? 'b' : 'n'}`;
  return canvasTexture(scene, key, CAR_W, CAR_H, (c) =>
    drawCarRear(c, body, color, frame, braking),
  );
}

export function carSideTexture(scene: Phaser.Scene, body: Body, color: string): string {
  return canvasTexture(scene, `carside-${body}-${color.slice(1)}`, SIDE_W, SIDE_H, (c) =>
    drawCarSide(c, body, color),
  );
}

export function generateRaceTextures(scene: Phaser.Scene): void {
  for (const [key, [w, h, draw]] of Object.entries({ ...SCENERY, ...BACKDROPS }))
    canvasTexture(scene, key, w, h, draw);
}

export { CAR_H, CAR_W };

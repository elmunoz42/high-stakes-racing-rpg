import type Phaser from 'phaser';
import { type Body, CAR_H, CAR_W, SIDE_H, SIDE_W, drawCarRear, drawCarSide } from './cars.ts';
import { drawPerson, type Look, PERSON_H, PERSON_W, type Style } from './people.ts';
import type { Ctx } from './pixel.ts';
import {
  drawBarRoom,
  drawLocalBuilding,
  drawLocalRoom,
  drawTownMid,
  INTERIORS,
  PADDOCK,
  type Sign,
  TOWN,
} from './town.ts';
import { bands } from './pixel.ts';
import { LOOKS } from './race.ts';
import { BACKDROPS, lookArt, type LookId, SCENERY, SCENERY_AWAY } from './race.ts';

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
  for (const [key, [w, h, draw]] of Object.entries({ ...SCENERY, ...SCENERY_AWAY, ...BACKDROPS }))
    canvasTexture(scene, key, w, h, draw);
}

export function generateTownTextures(scene: Phaser.Scene): void {
  for (const [key, [w, h, draw]] of Object.entries({ ...TOWN, ...PADDOCK, ...INTERIORS }))
    canvasTexture(scene, key, w, h, draw);
}

/** Five frames per person: `${key}-0` standing, `${key}-1..4` walking. */
export function personTextures(scene: Phaser.Scene, key: string, look: Look, style: Style): string {
  for (let f = 0; f < 5; f++)
    canvasTexture(scene, `${key}-${f}`, PERSON_W, PERSON_H, (c) => drawPerson(c, look, style, f));
  return key;
}

/** Sky, sun or moon, clouds and mountains for a look. Keys: bg-sky-<id> and so on. */
export function generateLookTextures(scene: Phaser.Scene, id: LookId): void {
  for (const [key, [w, h, draw]] of Object.entries(lookArt(id)))
    canvasTexture(scene, key, w, h, draw);
  canvasTexture(scene, `town-sky-${id}`, 384, 216, (c) =>
    bands(c, 0, 0, 384, 150, LOOKS[id].sky, 40),
  );
  canvasTexture(scene, `town-mid-${id}`, 128, 64, (c) => drawTownMid(c, id));
}

/** Outside and inside of a generated local business. */
export function localTextures(
  scene: Phaser.Scene,
  art: string,
  room: string,
  sign: Sign,
  isBar = false,
): void {
  canvasTexture(scene, art, 190, 116, (c) => drawLocalBuilding(c, sign));
  canvasTexture(scene, room, 384, 216, (c) =>
    isBar ? drawBarRoom(c, sign) : drawLocalRoom(c, sign),
  );
}

export { CAR_H, CAR_W };

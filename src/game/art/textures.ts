import Phaser from 'phaser';
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

const mipLevels = new Map<string, number>();
const MAX_LEVELS = 6;

/**
 * Builds smoothly downscaled copies of a texture: `${key}@0` (same size,
 * smoothed), `${key}@1` (half), `${key}@2` (quarter) and so on.
 * Returns how many levels below the original exist.
 */
function ensureMips(scene: Phaser.Scene, key: string): number {
  const known = mipLevels.get(key);
  if (known !== undefined) return known;
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
  let w = src.width;
  let h = src.height;
  let prev: HTMLCanvasElement | HTMLImageElement = src;
  let level = 0;
  const add = (canvas: HTMLCanvasElement, l: number) => {
    const t = scene.textures.addCanvas(`${key}@${l}`, canvas);
    t?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  };
  const copy = document.createElement('canvas');
  copy.width = w;
  copy.height = h;
  copy.getContext('2d')!.drawImage(prev, 0, 0);
  add(copy, 0);
  prev = copy;
  while (level < MAX_LEVELS && w > 2 && h > 2) {
    level += 1;
    w = Math.max(1, Math.ceil(w / 2));
    h = Math.max(1, Math.ceil(h / 2));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(prev, 0, 0, w, h);
    add(c, level);
    prev = c;
  }
  mipLevels.set(key, level);
  return level;
}

/**
 * The texture to draw `key` with at `displayW` pixels wide. Drawn at full
 * size or larger, the crisp original. Drawn smaller, a pre-shrunk smooth copy
 * no more than twice the display size: pixel art shrunk with nearest-neighbour
 * sampling picks different texels every frame, so small sprites shimmer.
 */
export function mipFor(scene: Phaser.Scene, key: string, displayW: number): string {
  const base = scene.textures.get(key).getSourceImage() as { width: number };
  // Big on screen: crisp pixel art. Between 1x and 2x, nearest-neighbour turns
  // single texels into one- or two-pixel blocks that swap as the sprite grows,
  // so use the smooth copy there too.
  if (displayW >= base.width * 2) return key;
  const top = ensureMips(scene, key);
  if (displayW >= base.width) return `${key}@0`;
  // Round up: a copy no wider than the display, gently enlarged, never shrunk.
  // Shrinking even a little lets fine detail (crowds, windows) shimmer.
  const level = Math.max(
    0,
    Math.min(top, Math.ceil(Math.log2(base.width / Math.max(0.5, displayW)))),
  );
  return `${key}@${level}`;
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

import type { RaceSim, SimCar, Surface } from './sim.ts';
import {
  LANES,
  ROAD_HALF_WIDTH,
  SEGMENT_LENGTH,
  type SceneryKind,
  type Segment,
  heightAt,
  segmentAt,
} from './track.ts';

/**
 * Pseudo-3D projection. Turns the simulation into a draw list: trapezoids
 * for the ground and road, scaled sprites for scenery and cars. Pure: no Phaser.
 *
 * Technique: segments are projected with a perspective divide from a camera
 * behind the player. Curves are an accumulating horizontal offset; hills are
 * segment elevation. Road segments are walked front to back and clipped by
 * the highest screen row drawn so far, so crests hide what is behind them.
 */

export const SCREEN_W = 384;
export const SCREEN_H = 216;
export const HORIZON_Y = 92;
export const DRAW_SEGMENTS = 200;
export const CAMERA_HEIGHT = 3.4;
export const CAMERA_DEPTH = 1 / Math.tan(((100 / 2) * Math.PI) / 180);
/** Distance from camera to the player's car, m. */
export const PLAYER_DISTANCE = 5.4;
/** Cars are drawn a little larger than life so they read at 384x216. */
export const CAR_SPRITE_SCALE = 1.35;
/** Colour the distance fades to (dusk haze). */
export const HAZE = 0xe8987a;
/** Fraction of the draw distance at which the ground is fully haze. */
export const FOG_FULL = 0.62;

export interface Camera {
  /** Projection depth: smaller is a wider field of view. */
  depth: number;
  /** Height above the road, m. */
  height: number;
}
export const DEFAULT_CAMERA: Camera = { depth: CAMERA_DEPTH, height: CAMERA_HEIGHT };

/** Sprite world sizes in metres (width, height). */
export const SPRITE_METERS: Record<string, { w: number; h: number }> = {
  lamp: { w: 1.6, h: 7.2 },
  palm: { w: 4.8, h: 8.4 },
  'billboard-voltkat': { w: 8.4, h: 5.8 },
  'billboard-varga': { w: 8.4, h: 5.8 },
  'billboard-teo': { w: 8.4, h: 5.8 },
  warehouse: { w: 20, h: 10 },
  containers: { w: 12, h: 6.6 },
  crane: { w: 14, h: 24.5 },
  bollard: { w: 0.7, h: 0.9 },
  railing: { w: 5.2, h: 1.3 },
  shops: { w: 14, h: 10.5 },
  apartments: { w: 11, h: 17 },
  rock: { w: 3.6, h: 2.4 },
  pine: { w: 3.8, h: 8.8 },
  bush: { w: 2.2, h: 1.2 },
  truss: { w: 2, h: 8.7 },
  lighthouse: { w: 7, h: 25.5 },
  sailboat: { w: 7, h: 7.6 },
  gantry: { w: 17.6, h: 6.6 },
  grandstand: { w: 20, h: 9 },
  barrier: { w: 5.2, h: 1.1 },
  'chevron-l': { w: 2, h: 3 },
  'chevron-r': { w: 2, h: 3 },
  cabin: { w: 9, h: 6.5 },
  cactus: { w: 2.2, h: 4.4 },
  mesa: { w: 46, h: 20 },
  'gas-station': { w: 16, h: 7 },
  tower: { w: 13, h: 34 },
  neon: { w: 4.5, h: 7 },
  'tunnel-arch': { w: 19, h: 8.2 },
  'pine-snow': { w: 3.8, h: 8.8 },
  snowbank: { w: 5.2, h: 1.4 },
  flag: { w: 2.2, h: 7 },
  'pit-building': { w: 30, h: 9 },
  car: { w: 1.8 * CAR_SPRITE_SCALE, h: 1.35 * CAR_SPRITE_SCALE },
};

export interface Quad {
  x1: number;
  y1: number;
  w1: number;
  x2: number;
  y2: number;
  w2: number;
  color: number;
}

export interface CarDraw {
  id: string;
  color: string;
  body: SimCar['body'];
  /** Yaw for the sprite frame, about -1.5..1.5. */
  steer: number;
  braking: boolean;
  slide: number;
  surface: Surface;
  isPlayer: boolean;
}

export interface SpriteDraw {
  key: string;
  /** Screen x of the sprite's bottom centre. */
  x: number;
  /** Screen y of the sprite's bottom. */
  y: number;
  /** On-screen width, px. */
  w: number;
  /** On-screen height, px. */
  h: number;
  /** Rows at or below this y are hidden by a nearer crest. */
  clipY: number;
  flip: boolean;
  /** Draw order: larger is nearer. */
  depth: number;
  /** 0 = near, 1 = at the draw distance; for fading into the haze. */
  fog: number;
  car?: CarDraw;
}

export interface DrawList {
  quads: Quad[];
  sprites: SpriteDraw[];
}

interface Ground {
  left: [number, number];
  right: [number, number];
  road: [number, number];
  /** Paved strip beside the kerb, as a fraction of the road half-width. */
  verge?: { color: [number, number]; width: number; sides: 'left' | 'both' };
}

const WATER: [number, number] = [0x2c62a4, 0x3470b4];
const GRASS: [number, number] = [0x3b7c46, 0x34713f];
const ROAD: [number, number] = [0x54555f, 0x4e4f59];

export const GROUND: Record<SceneryKind, Ground> = {
  harbour: {
    left: WATER,
    right: [0xc7b189, 0xbda77f],
    road: ROAD,
    verge: { color: [0xd6ccb4, 0xcbc1a9], width: 0.5, sides: 'left' },
  },
  docks: { left: [0x77777f, 0x6f6f78], right: [0x77777f, 0x6f6f78], road: [0x4a4b55, 0x44454f] },
  town: { left: [0x8c8377, 0x847b6f], right: [0x8c8377, 0x847b6f], road: ROAD },
  cliff: { left: GRASS, right: GRASS, road: ROAD },
  bridge: {
    left: WATER,
    right: WATER,
    road: [0x6a6b74, 0x62636c],
    verge: { color: [0x8a8c96, 0x7f818b], width: 0.22, sides: 'both' },
  },
  lighthouse: { left: [0x5a8e4a, 0x528544], right: [0x5a8e4a, 0x528544], road: ROAD },
  forest: { left: [0x2f6b3a, 0x296134], right: [0x2f6b3a, 0x296134], road: ROAD },
  desert: { left: [0xd9b677, 0xcfab6c], right: [0xd9b677, 0xcfab6c], road: [0x5e5a58, 0x575351] },
  city: {
    left: [0x2b2d3a, 0x262834],
    right: [0x2b2d3a, 0x262834],
    road: [0x35363f, 0x303139],
    verge: { color: [0x4a4c5a, 0x444653], width: 0.3, sides: 'both' },
  },
  tunnel: { left: [0x1c1d26, 0x191a22], right: [0x1c1d26, 0x191a22], road: [0x2e2f37, 0x292a31] },
  snow: { left: [0xe8eef4, 0xdde5ee], right: [0xe8eef4, 0xdde5ee], road: [0x7d8590, 0x747c87] },
  circuit: {
    left: [0x3f8a3f, 0x387f38],
    right: [0x3f8a3f, 0x387f38],
    road: [0x4a4b54, 0x44454e],
    verge: { color: [0xb9a67c, 0xb09d73], width: 0.6, sides: 'both' },
  },
};

const RUMBLE = [0xd7263d, 0xf2f2f2];
const PAINT = 0xf2f2f2;
const CHECKER = [0xf2f2f2, 0x16161c];

function mix(a: number, b: number, t: number): number {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

interface Projected {
  x: number;
  y: number;
  w: number;
  scale: number;
}

function project(cam: Camera, camX: number, camY: number, camZ: number): Projected {
  const scale = cam.depth / camZ;
  const half = SCREEN_W / 2;
  return {
    x: half + scale * camX * half,
    y: HORIZON_Y - scale * camY * half,
    w: scale * ROAD_HALF_WIDTH * half,
    scale,
  };
}

const clampX = (x: number) => Math.max(0, Math.min(SCREEN_W, x));

export function buildDrawList(
  sim: RaceSim,
  cam: Camera = DEFAULT_CAMERA,
  haze: number = HAZE,
): DrawList {
  const player = sim.player ?? sim.cars[0]!;
  const track = sim.track;
  const L = track.length;
  const N = track.segments.length;
  const cameraZ = player.z - PLAYER_DISTANCE;
  const cameraX = player.x * 0.88;
  const cameraY = heightAt(track, player.z) + cam.height;
  const base = segmentAt(track, cameraZ);
  const lapBase = Math.floor(cameraZ / L) * L;
  const basePercent = (cameraZ - lapBase - base.z) / SEGMENT_LENGTH;

  // A solid band of haze from the horizon down sits behind all ground, so the
  // seam where the road meets the sky never shows gaps or flicker.
  const quads: Quad[] = [
    {
      x1: SCREEN_W / 2,
      y1: SCREEN_H,
      w1: SCREEN_W,
      x2: SCREEN_W / 2,
      y2: HORIZON_Y - 2,
      w2: SCREEN_W,
      color: haze,
    },
  ];
  const sprites: SpriteDraw[] = [];
  const rows: { seg: Segment; p1: Projected; p2: Projected; clip: number; z1: number }[] = [];

  const curveStep = (s: Segment) => s.kappa * SEGMENT_LENGTH * SEGMENT_LENGTH;
  let dx = -curveStep(base) * basePercent;
  let x = 0;
  let maxY = SCREEN_H;

  for (let n = 0; n < DRAW_SEGMENTS; n++) {
    const idx = base.index + n;
    const seg = track.segments[idx % N]!;
    const z1 = lapBase + seg.z + (idx >= N ? L : 0) - cameraZ;
    const z2 = z1 + SEGMENT_LENGTH;
    const p1 = project(cam, x - cameraX, seg.y1 - cameraY, Math.max(z1, 0.01));
    const p2 = project(cam, x + dx - cameraX, seg.y2 - cameraY, Math.max(z2, 0.01));
    rows.push({ seg, p1, p2, clip: maxY, z1 });
    x += dx;
    dx += curveStep(seg);

    if (z1 <= cam.depth * 0.5 || p2.y >= p1.y || p2.y >= maxY) continue;

    // Distance fades everything fully into the haze, and stripe contrast fades
    // out sooner: far segments are under a pixel tall, and alternating colours
    // at that size shimmer.
    // A plain distance fade that reaches full haze well before the far end, so
    // every strip thin enough to shimmer is already one flat colour. (Fading by
    // screen position instead made strips at hill crests flip colour.)
    const fog = Math.min(1, (n / (DRAW_SEGMENTS * FOG_FULL)) ** 1.5);
    const flat = Math.min(1, fog * 2.4);
    const tint = (c: number) => mix(c, haze, fog);
    const s = seg.stripe ? 0 : 1;
    const band = (pair: readonly number[]) => mix(pair[s]!, mix(pair[0]!, pair[1]!, 0.5), flat);
    const y1 = Math.round(p1.y);
    const y2 = Math.round(p2.y);
    if (y1 <= y2) {
      maxY = p2.y;
      continue;
    }
    const g = GROUND[seg.theme];
    const quad = (cx1: number, w1: number, cx2: number, w2: number, color: number) =>
      quads.push({ x1: cx1, y1, w1, x2: cx2, y2, w2, color: tint(color) });

    // Ground either side of the road centre.
    const c1 = clampX(p1.x);
    const c2 = clampX(p2.x);
    quad(c1 / 2, c1 / 2, c2 / 2, c2 / 2, band(g.left));
    quad(
      (c1 + SCREEN_W) / 2,
      (SCREEN_W - c1) / 2,
      (c2 + SCREEN_W) / 2,
      (SCREEN_W - c2) / 2,
      band(g.right),
    );
    if (g.verge) {
      const k = 1.125 + g.verge.width;
      if (g.verge.sides === 'both') quad(p1.x, p1.w * k, p2.x, p2.w * k, band(g.verge.color));
      else
        quad(
          p1.x - (p1.w * k) / 2,
          (p1.w * k) / 2,
          p2.x - (p2.w * k) / 2,
          (p2.w * k) / 2,
          band(g.verge.color),
        );
    }
    // Kerbs, road, paint.
    quad(p1.x, p1.w * 1.125, p2.x, p2.w * 1.125, band(RUMBLE));
    quad(p1.x, p1.w, p2.x, p2.w, band(g.road));
    if (seg.isStartLine) {
      for (let k = 0; k < 8; k++) {
        const f = -1 + (2 * k + 1) / 8;
        quad(p1.x + p1.w * f, p1.w / 8, p2.x + p2.w * f, p2.w / 8, CHECKER[(k + seg.index) % 2]!);
      }
    } else if (fog < 0.55) {
      for (const side of [-0.92, 0.92])
        quad(p1.x + p1.w * side, p1.w / 48, p2.x + p2.w * side, p2.w / 48, PAINT);
      if (seg.stripe) {
        for (let lane = 1; lane < LANES; lane++) {
          const f = -1 + (2 * lane) / LANES;
          quad(p1.x + p1.w * f, p1.w / 40, p2.x + p2.w * f, p2.w / 40, PAINT);
        }
      }
    }
    maxY = p2.y;
  }

  // Scenery, far to near.
  const half = SCREEN_W / 2;
  for (let n = rows.length - 1; n > 0; n--) {
    const row = rows[n]!;
    if (row.z1 <= 0.5) continue;
    for (const s of row.seg.scenery) {
      const size = SPRITE_METERS[s.key];
      if (!size) continue;
      const w = row.p1.scale * size.w * half;
      if (w < 0.6) continue;
      const sx = row.p1.x + row.p1.scale * s.x * half;
      if (sx + w < -20 || sx - w > SCREEN_W + 20) continue;
      sprites.push({
        key: s.key,
        x: sx,
        y: row.p1.y,
        w,
        h: row.p1.scale * size.h * half,
        clipY: row.clip,
        flip: !!s.flip,
        depth: DRAW_SEGMENTS - n,
        fog: n / DRAW_SEGMENTS,
      });
    }
  }

  const carDraw = (car: SimCar): CarDraw => ({
    id: car.id,
    color: car.color,
    body: car.body,
    steer: car.steerVisual,
    braking: car.braking,
    slide: car.slide,
    surface: car.surface,
    isPlayer: car === player,
  });

  // Other cars by interpolated position.
  for (const car of sim.cars) {
    if (car === player) continue;
    const rel = car.z - cameraZ;
    if (rel <= PLAYER_DISTANCE * 0.5 || rel > (DRAW_SEGMENTS - 2) * SEGMENT_LENGTH) continue;
    const n = Math.floor((rel + basePercent * SEGMENT_LENGTH) / SEGMENT_LENGTH);
    const row = rows[n];
    if (!row) continue;
    const t = (rel - row.z1) / SEGMENT_LENGTH;
    const px = row.p1.x + (row.p2.x - row.p1.x) * t;
    const py = row.p1.y + (row.p2.y - row.p1.y) * t;
    const scale = row.p1.scale + (row.p2.scale - row.p1.scale) * t;
    const size = SPRITE_METERS.car!;
    sprites.push({
      key: 'car',
      x: px + scale * car.x * half,
      y: py,
      w: scale * size.w * half,
      h: scale * size.h * half,
      clipY: row.clip,
      flip: false,
      depth: DRAW_SEGMENTS - n + 0.5,
      fog: n / DRAW_SEGMENTS,
      car: carDraw(car),
    });
  }

  // The player's car, always at the same distance from the camera.
  const pScale = cam.depth / PLAYER_DISTANCE;
  const pRow = project(cam, 0, heightAt(track, player.z) - cameraY, PLAYER_DISTANCE);
  const size = SPRITE_METERS.car!;
  sprites.push({
    key: 'car',
    x: half + pScale * (player.x - cameraX) * half,
    y: pRow.y,
    w: pScale * size.w * half,
    h: pScale * size.h * half,
    clipY: SCREEN_H,
    flip: false,
    depth: DRAW_SEGMENTS + 10,
    fog: 0,
    car: carDraw(player),
  });

  sprites.sort((a, b) => a.depth - b.depth);
  return { quads, sprites };
}

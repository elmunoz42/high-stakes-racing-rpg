import type { RaceSim, SimCar } from './sim.ts';
import {
  LANES,
  ROAD_HALF_WIDTH,
  SEGMENT_LENGTH,
  type Segment,
  heightAt,
  segmentAt,
} from './track.ts';

/**
 * Pseudo-3D projection. Turns the simulation into a draw list: trapezoids
 * for the road, scaled sprites for scenery and cars. Pure: no Phaser.
 *
 * Technique: segments are projected with a perspective divide from a camera
 * behind the player. Curves are an accumulating horizontal offset; hills are
 * segment elevation. Road segments are drawn front to back and clipped by
 * the highest screen row drawn so far, so crests hide what is behind them.
 */

export const SCREEN_W = 384;
export const SCREEN_H = 216;
export const HORIZON_Y = 92;
export const DRAW_SEGMENTS = 180;
export const CAMERA_HEIGHT = 3.4;
export const CAMERA_DEPTH = 1 / Math.tan(((100 / 2) * Math.PI) / 180);
/** Distance from camera to the player's car, m. */
export const PLAYER_DISTANCE = 5.4;
/** Cars are drawn a little larger than life so they read at 384x216. */
export const CAR_SPRITE_SCALE = 1.35;

/** Sprite world sizes in metres (width, height). */
export const SPRITE_METERS: Record<string, { w: number; h: number }> = {
  lamp: { w: 1.4, h: 6.5 },
  palm: { w: 4, h: 7.5 },
  billboard: { w: 7, h: 4.8 },
  warehouse: { w: 16, h: 9 },
  crane: { w: 12, h: 22 },
  bollard: { w: 0.6, h: 0.9 },
  shopfront: { w: 10, h: 8 },
  rock: { w: 3.2, h: 2.2 },
  pine: { w: 3.5, h: 8 },
  girder: { w: 0.9, h: 7 },
  lighthouse: { w: 7, h: 26 },
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
  car?: { id: string; color: string; body: SimCar['body']; steer: number; isPlayer: boolean };
}

export interface DrawList {
  quads: Quad[];
  sprites: SpriteDraw[];
}

const PALETTE = {
  road: [0x5d5f6b, 0x585a66],
  grass: [0x3e8c45, 0x37803e],
  rumble: [0xd7263d, 0xf2f2f2],
  lane: 0xf2f2f2,
  start: 0xf2f2f2,
  fog: 0x9fb8d6,
};

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

function project(camX: number, camY: number, camZ: number): Projected {
  const scale = CAMERA_DEPTH / camZ;
  const half = SCREEN_W / 2;
  return {
    x: half + scale * camX * half,
    y: HORIZON_Y - scale * camY * half,
    w: scale * ROAD_HALF_WIDTH * half,
    scale,
  };
}

export function buildDrawList(sim: RaceSim): DrawList {
  const player = sim.player ?? sim.cars[0]!;
  const track = sim.track;
  const L = track.length;
  const N = track.segments.length;
  const cameraZ = player.z - PLAYER_DISTANCE;
  const cameraX = player.x * 0.9;
  const cameraY = heightAt(track, player.z) + CAMERA_HEIGHT;
  const base = segmentAt(track, cameraZ);
  const lapBase = Math.floor(cameraZ / L) * L;
  const basePercent = (cameraZ - lapBase - base.z) / SEGMENT_LENGTH;

  const quads: Quad[] = [];
  const sprites: SpriteDraw[] = [];
  const rows: {
    seg: Segment;
    p1: Projected;
    p2: Projected;
    clip: number;
    xOffset: number;
    z1: number;
  }[] = [];

  const curveStep = (s: Segment) => s.kappa * SEGMENT_LENGTH * SEGMENT_LENGTH;
  let dx = -curveStep(base) * basePercent;
  let x = 0;
  let maxY = SCREEN_H;

  for (let n = 0; n < DRAW_SEGMENTS; n++) {
    const idx = base.index + n;
    const seg = track.segments[idx % N]!;
    const z1 = lapBase + seg.z + (idx >= N ? L : 0) - cameraZ;
    const z2 = z1 + SEGMENT_LENGTH;
    const p1 = project(x - cameraX, seg.y1 - cameraY, Math.max(z1, 0.01));
    const p2 = project(x + dx - cameraX, seg.y2 - cameraY, Math.max(z2, 0.01));
    rows.push({ seg, p1, p2, clip: maxY, xOffset: x, z1 });
    x += dx;
    dx += curveStep(seg);

    if (z1 <= CAMERA_DEPTH * 0.5 || p2.y >= p1.y || p2.y >= maxY) continue;

    const fog = Math.min(0.75, (n / DRAW_SEGMENTS) ** 1.6);
    const tint = (c: number) => mix(c, PALETTE.fog, fog);
    const stripe = seg.stripe ? 0 : 1;
    const top = Math.max(p2.y, 0);
    const bottom = Math.min(p1.y, maxY);
    if (bottom <= top) continue;

    quads.push({
      x1: SCREEN_W / 2,
      y1: p1.y,
      w1: SCREEN_W,
      x2: SCREEN_W / 2,
      y2: p2.y,
      w2: SCREEN_W,
      color: tint(PALETTE.grass[stripe]!),
    });
    quads.push({
      x1: p1.x,
      y1: p1.y,
      w1: p1.w * 1.12,
      x2: p2.x,
      y2: p2.y,
      w2: p2.w * 1.12,
      color: tint(PALETTE.rumble[stripe]!),
    });
    quads.push({
      x1: p1.x,
      y1: p1.y,
      w1: p1.w,
      x2: p2.x,
      y2: p2.y,
      w2: p2.w,
      color: tint(seg.isStartLine ? PALETTE.start : PALETTE.road[stripe]!),
    });
    if (seg.stripe && !seg.isStartLine) {
      for (let lane = 1; lane < LANES; lane++) {
        const f = -1 + (2 * lane) / LANES;
        const lw1 = p1.w / 36;
        const lw2 = p2.w / 36;
        quads.push({
          x1: p1.x + p1.w * f,
          y1: p1.y,
          w1: lw1,
          x2: p2.x + p2.w * f,
          y2: p2.y,
          w2: lw2,
          color: tint(PALETTE.lane),
        });
      }
    }
    maxY = p2.y;
  }

  // Sprites, far to near.
  const half = SCREEN_W / 2;
  for (let n = rows.length - 1; n > 0; n--) {
    const row = rows[n]!;
    if (row.z1 <= 0.5) continue;
    for (const s of row.seg.scenery) {
      const size = SPRITE_METERS[s.key];
      if (!size) continue;
      const w = row.p1.scale * size.w * half;
      if (w < 0.6) continue;
      sprites.push({
        key: s.key,
        x: row.p1.x + row.p1.scale * s.x * half,
        y: row.p1.y,
        w,
        h: row.p1.scale * size.h * half,
        clipY: row.clip,
        flip: !!s.flip,
        depth: DRAW_SEGMENTS - n,
      });
    }
  }

  // Cars (other than the player) by interpolated position.
  for (const car of sim.cars) {
    if (car === player) continue;
    const rel = car.z - cameraZ;
    if (rel <= PLAYER_DISTANCE * 0.6 || rel > (DRAW_SEGMENTS - 2) * SEGMENT_LENGTH) continue;
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
      car: {
        id: car.id,
        color: car.color,
        body: car.body,
        steer: car.steerVisual,
        isPlayer: false,
      },
    });
  }

  // The player's car, always at the same depth.
  const pScale = CAMERA_DEPTH / PLAYER_DISTANCE;
  const pRow = project(0, heightAt(track, player.z) - cameraY, PLAYER_DISTANCE);
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
    car: {
      id: player.id,
      color: player.color,
      body: player.body,
      steer: player.steerVisual,
      isPlayer: true,
    },
  });

  sprites.sort((a, b) => a.depth - b.depth);
  return { quads, sprites };
}

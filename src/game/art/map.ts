import { ellipse, hash, line, type Ctx, rect, shade, text, trap } from './pixel.ts';

/**
 * The world map: one island, six places joined by a winding road. Original
 * generated art, like everything else in src/game/art.
 */

export const MAP_W = 384;
export const MAP_H = 216;

/** Where each location sits on the map (centre of its node). */
export const MAP_NODES: Record<string, { x: number; y: number }> = {
  'harbour-district': { x: 58, y: 138 },
  pinewood: { x: 132, y: 110 },
  dustbowl: { x: 214, y: 138 },
  'neon-city': { x: 304, y: 112 },
  glacier: { x: 262, y: 46 },
  autodrome: { x: 138, y: 42 },
};

/** The road between each place and the next, through these bends. */
const LEGS: [number, number][][] = [
  [
    [58, 138],
    [84, 146],
    [104, 126],
    [132, 110],
  ],
  [
    [132, 110],
    [162, 100],
    [182, 132],
    [214, 138],
  ],
  [
    [214, 138],
    [252, 148],
    [278, 128],
    [304, 112],
  ],
  [
    [304, 112],
    [324, 84],
    [292, 64],
    [262, 46],
  ],
  [
    [262, 46],
    [226, 26],
    [186, 54],
    [138, 42],
  ],
];

/** Points along one leg every ~2 px, a smooth curve through its bends. */
export function legPoints(leg: number): { x: number; y: number }[] {
  const p = LEGS[leg];
  if (!p) return [];
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)]!;
    const p1 = p[i]!;
    const p2 = p[i + 1]!;
    const p3 = p[Math.min(p.length - 1, i + 2)]!;
    const steps = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t * t +
          (-a + 3 * b - 3 * c + d) * t ** 3);
      out.push({ x: cr(p0[0], p1[0], p2[0], p3[0]), y: cr(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const end = p[p.length - 1]!;
  out.push({ x: end[0], y: end[1] });
  return out;
}

const SEA = '#2a5d9c';
const SEA_DEEP = '#224f88';
const SAND = '#e3cf98';
const GRASS = '#5a9c48';
const GRASS_DARK = '#4b8a3d';

/** Land as overlapping blobs: [x, y, rx, ry]. */
const LAND: [number, number, number, number][] = [
  [200, 100, 150, 78],
  [120, 70, 90, 56],
  [270, 60, 100, 52],
  [110, 128, 64, 34],
  [300, 150, 70, 40],
  [180, 160, 90, 38],
];

function land(c: Ctx, grow: number, color: string): void {
  for (const [x, y, rx, ry] of LAND) ellipse(c, color, x, y, rx + grow, ry + grow);
}

function pine(c: Ctx, x: number, y: number, snow = false): void {
  const green = snow ? '#2f6b4a' : '#2a6b34';
  trap(c, shade(green, 0.8), y - 9, y - 1, x, x + 1, x - 4, x + 5);
  trap(c, green, y - 9, y - 3, x, x + 1, x - 3, x + 4);
  if (snow) trap(c, '#eef4f8', y - 9, y - 6, x, x + 1, x - 1, x + 2);
  rect(c, '#5a3b22', x, y - 1, 1, 2);
}

function mountain(c: Ctx, x: number, y: number, h: number, w: number): void {
  trap(c, '#7c8796', y - h, y, x, x + 1, x - w, x + w);
  trap(c, '#9aa6b5', y - h, y, x, x + 1, x - w * 0.15, x + w);
  const cap = Math.round(h * 0.4);
  trap(c, '#f4f8fb', y - h, y - h + cap, x, x + 1, x - w * 0.4, x + w * 0.4);
}

function mesa(c: Ctx, x: number, y: number, w: number): void {
  trap(c, '#b5683a', y - 7, y, x - w / 2 + 2, x + w / 2 - 2, x - w / 2, x + w / 2);
  rect(c, '#cf8550', x - w / 2 + 2, y - 7, w - 4, 2);
}

function block(c: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  rect(c, '#2a2d44', x, y - h, w, h);
  rect(c, '#3a3e5c', x, y - h, 1, h);
  for (let wy = y - h + 2; wy < y - 1; wy += 3)
    for (let wx = x + 1; wx < x + w - 1; wx += 2)
      if (hash(seed + wx * 7 + wy * 13) > 0.45)
        rect(c, hash(seed + wx + wy) > 0.8 ? '#ff5fa2' : '#ffd86b', wx, wy, 1, 1);
}

/** The whole map background, names included. */
export function drawWorldMap(c: Ctx): void {
  // Sea, with rows of little wave marks.
  rect(c, SEA, 0, 0, MAP_W, MAP_H);
  for (let y = 4; y < MAP_H; y += 9)
    for (let x = (y * 7) % 23; x < MAP_W; x += 23)
      if (hash(x * 31 + y) > 0.35) rect(c, '#4f84c4', x, y, 4, 1);
  for (let y = 0; y < MAP_H; y += 2) if (y % 6 === 0) rect(c, SEA_DEEP, 0, y, 3, 1);

  // Island: shallow water, beach, grass.
  land(c, 7, '#3f78b8');
  land(c, 3, SAND);
  land(c, 0, GRASS);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(hash(i * 3) * MAP_W);
    const y = Math.floor(hash(i * 3 + 1) * MAP_H);
    if (c.getImageData(x, y, 1, 1).data[1] === 0x9c) rect(c, GRASS_DARK, x, y, 2, 1);
  }

  // Harbour: docks, a crane and a lighthouse on the south-west coast.
  rect(c, '#8a8f99', 34, 146, 26, 8);
  for (const x of [36, 44, 52]) rect(c, '#6d717b', x, 154, 2, 10);
  rect(c, '#c9463d', 40, 144, 6, 3);
  rect(c, '#3d6fb0', 47, 144, 6, 3);
  line(c, '#e0a63a', 30, 152, 30, 134);
  line(c, '#e0a63a', 30, 134, 40, 132);
  rect(c, '#f2efe6', 20, 124, 3, 9);
  rect(c, '#d7263d', 20, 127, 3, 2);
  rect(c, '#ffe18a', 20, 122, 3, 2);

  // Pinewood: forest hills.
  ellipse(c, GRASS_DARK, 128, 96, 34, 14);
  for (let i = 0; i < 26; i++) {
    const x = 98 + Math.floor(hash(i * 11 + 5) * 62);
    const y = 86 + Math.floor(hash(i * 11 + 6) * 22);
    if (Math.hypot(x - 132, y - 110) > 9) pine(c, x, y);
  }

  // Dustbowl: desert with mesas and cacti.
  ellipse(c, '#d9b677', 214, 150, 42, 16);
  ellipse(c, '#cfab6c', 226, 156, 24, 8);
  mesa(c, 190, 150, 16);
  mesa(c, 244, 156, 12);
  for (const [x, y] of [
    [202, 158],
    [232, 146],
    [254, 150],
  ] as const) {
    rect(c, '#3f7d3a', x, y - 5, 2, 5);
    rect(c, '#3f7d3a', x - 2, y - 4, 2, 1);
  }

  // Neon City: a block of towers on the east coast.
  ellipse(c, '#3a3d52', 310, 120, 30, 13);
  const towers: [number, number, number][] = [
    [288, 6, 14],
    [295, 7, 22],
    [303, 6, 17],
    [310, 8, 26],
    [319, 6, 15],
    [326, 7, 19],
  ];
  towers.forEach(([x, w, h], i) => block(c, x, 124, w, h, i * 97));

  // Glacier: snowy peaks in the north-east.
  ellipse(c, '#dfe8ef', 268, 40, 46, 20);
  mountain(c, 236, 52, 22, 13);
  mountain(c, 292, 48, 26, 15);
  mountain(c, 262, 30, 18, 11);
  for (const [x, y] of [
    [222, 58],
    [306, 58],
    [246, 60],
  ] as const)
    pine(c, x, y, true);

  // Grand Autodrome: an oval circuit with a grandstand.
  ellipse(c, '#58585f', 138, 46, 24, 11);
  ellipse(c, GRASS, 138, 46, 20, 8);
  ellipse(c, '#4f9a4a', 138, 46, 16, 6);
  rect(c, '#e9e6dc', 126, 32, 24, 3);
  rect(c, '#c9463d', 126, 31, 24, 1);
  for (let x = 116; x < 124; x += 2) rect(c, x % 4 ? '#f2f2f2' : '#16161c', x, 46, 2, 2);

  // Compass rose, bottom right.
  const cx = 360;
  const cy = 196;
  line(c, '#f2efe6', cx, cy - 8, cx, cy + 8);
  line(c, '#f2efe6', cx - 8, cy, cx + 8, cy);
  trap(c, '#d7263d', cy - 10, cy - 2, cx, cx + 1, cx - 2, cx + 3);
  text(c, 'N', cx, cy - 14, '#f2efe6', 7);
}

/** A place name with a dark outline, centred under its node. */
export function drawLabel(c: Ctx, name: string, x: number, y: number, color: string): void {
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const)
    text(c, name, x + dx, y + dy, '#141826', 7);
  text(c, name, x, y, color, 7);
}

/** Node pads, the cleared flag, the lock and the cursor. Keys map-*. */
export const MAP_ART: Record<string, [number, number, (c: Ctx) => void]> = {
  'map-pad-open': [14, 10, (c) => pad(c, '#ffcc33')],
  'map-pad-cleared': [14, 10, (c) => pad(c, '#4fd27a')],
  'map-pad-locked': [14, 10, (c) => pad(c, '#8a8f99')],
  'map-pad-here': [14, 10, (c) => pad(c, '#6fd0ff')],
  'map-flag': [
    9,
    14,
    (c) => {
      rect(c, '#f2efe6', 1, 0, 1, 14);
      for (let y = 0; y < 3; y++)
        for (let x = 0; x < 3; x++)
          rect(c, (x + y) % 2 ? '#16161c' : '#f2f2f2', 2 + x * 2, y * 2, 2, 2);
    },
  ],
  'map-lock': [
    8,
    9,
    (c) => {
      rect(c, '#2a2d38', 2, 0, 4, 1);
      rect(c, '#2a2d38', 1, 1, 1, 3);
      rect(c, '#2a2d38', 6, 1, 1, 3);
      rect(c, '#d9a93a', 0, 4, 8, 5);
      rect(c, '#2a2d38', 3, 5, 2, 2);
    },
  ],
  'map-cursor': [
    11,
    7,
    (c) => {
      trap(c, '#141826', 0, 7, 0, 11, 5, 6);
      trap(c, '#ffcc33', 1, 6, 2, 9, 5, 6);
    },
  ],
  'map-cloud': [
    40,
    12,
    (c) => {
      ellipse(c, '#ffffff', 14, 7, 12, 4, 0.85);
      ellipse(c, '#ffffff', 26, 6, 10, 5, 0.85);
      ellipse(c, '#e6eef8', 20, 9, 16, 2, 0.85);
    },
  ],
};

function pad(c: Ctx, color: string): void {
  ellipse(c, '#141826', 7, 5, 7, 4);
  ellipse(c, shade(color, 0.7), 7, 5, 6, 3);
  ellipse(c, color, 7, 4, 5, 2);
}

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

/**
 * The whole map background. `names` (location id to name) keeps scenery off
 * the place labels.
 */
export function drawWorldMap(c: Ctx, names: Record<string, string> = {}): void {
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
  coast(c);
  terraces(c);
  const keep = clearance(names);
  hills(c, keep);
  water(c, keep);

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

  decorate(c, keep);

  // Compass rose, bottom right.
  const cx = 360;
  const cy = 196;
  line(c, '#f2efe6', cx, cy - 8, cx, cy + 8);
  line(c, '#f2efe6', cx - 8, cy, cx + 8, cy);
  trap(c, '#d7263d', cy - 10, cy - 2, cx, cx + 1, cx - 2, cx + 3);
  text(c, 'N', cx, cy - 14, '#f2efe6', 7);
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

// ---------------------------------------------------------------------------
// Terrain and decoration. Everything here stays off the road, the place pads
// and their names (see clearance), so the map still reads at a glance.

/** Inside the island, at least `inset` px from the beach. */
function onLand(x: number, y: number, inset = 0): boolean {
  return LAND.some(([cx, cy, rx, ry]) => {
    const a = rx - inset;
    const b = ry - inset;
    return a > 0 && b > 0 && ((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1;
  });
}

/** Ground already given to a region (forest, desert, city, glacier, circuit). */
const REGIONS: [number, number, number, number][] = [
  [128, 96, 38, 18],
  [214, 150, 46, 20],
  [310, 112, 34, 26],
  [268, 40, 50, 24],
  [138, 44, 28, 15],
  [40, 140, 26, 20],
];

type Keep = (x: number, y: number, w?: number, h?: number) => boolean;

/** A test for "free ground here": on land, off the road, pads, labels and regions. */
function clearance(names: Record<string, string>): Keep {
  const blocked = new Uint8Array(MAP_W * MAP_H);
  const block = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(MAP_H - 1, y1); y++)
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(MAP_W - 1, x1); x++)
        blocked[y * MAP_W + x] = 1;
  };
  for (let leg = 0; leg < LEGS.length; leg++)
    for (const p of legPoints(leg)) block(p.x - 4, p.y - 4, p.x + 4, p.y + 4);
  for (const [id, n] of Object.entries(MAP_NODES)) {
    block(n.x - 12, n.y - 22, n.x + 12, n.y + 7);
    const half = (names[id] ?? 'Grand Autodrome').length * 2.4 + 3;
    block(n.x - half, n.y + 5, n.x + half, n.y + 17);
  }
  for (const [cx, cy, rx, ry] of REGIONS)
    for (let y = cy - ry; y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) block(x, y, x, y);
  block(340, 176, MAP_W, MAP_H); // compass
  return (x, y, w = 1, h = 1) => {
    for (let yy = Math.floor(y); yy < y + h; yy++)
      for (let xx = Math.floor(x); xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= MAP_W || yy >= MAP_H) return false;
        if (blocked[yy * MAP_W + xx] || !onLand(xx, yy, 3)) return false;
      }
    return true;
  };
}

/** Smooth value noise in 0..1. */
function noise(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = x / cell - gx;
  const fy = y / cell - gy;
  const s = (t: number) => t * t * (3 - 2 * t);
  const v = (i: number, j: number) => hash(seed * 7717 + (gx + i) * 7919 + (gy + j) * 104729);
  const top = v(0, 0) + (v(1, 0) - v(0, 0)) * s(fx);
  const bot = v(0, 1) + (v(1, 1) - v(0, 1)) * s(fx);
  return top + (bot - top) * s(fy);
}

/** Grass shades from lowland to upland. */
const TERRACE = ['#4c8c40', '#559845', '#5fa24c', '#6aac53', '#77b75c', '#86c066'];

const height = (x: number, y: number) =>
  0.6 * noise(x, y, 46, 3) + 0.3 * noise(x, y, 17, 5) + 0.1 * noise(x, y, 6, 9);

/**
 * Terraced grassland: elevation in flat bands of green, each band edge drawn
 * as a darker contour line, like a relief map. Land rises inland.
 */
function terraces(c: Ctx): void {
  const img = c.getImageData(0, 0, MAP_W, MAP_H);
  const d = img.data;
  const band = (x: number, y: number) => {
    let inland = 0;
    for (let k = 3; k <= 30; k += 9) if (onLand(x, y, k)) inland += 1;
    const v = height(x, y) * 0.75 + inland * 0.09;
    return Math.max(0, Math.min(TERRACE.length - 1, Math.floor(v * TERRACE.length)));
  };
  const bands = new Int8Array(MAP_W * MAP_H).fill(-1);
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) if (onLand(x, y)) bands[y * MAP_W + x] = band(x, y);
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      const b = bands[y * MAP_W + x]!;
      if (b < 0) continue;
      const right = x + 1 < MAP_W ? bands[y * MAP_W + x + 1]! : b;
      const below = y + 1 < MAP_H ? bands[(y + 1) * MAP_W + x]! : b;
      let col = TERRACE[b]!;
      // Contour where the ground steps up; the step's lower side is in shadow.
      if ((right >= 0 && right !== b) || (below >= 0 && below !== b))
        col = shade(TERRACE[Math.max(b, right, below)]!, 0.8);
      else if (hash(x * 131 + y * 977) > 0.93) col = shade(col, 0.9);
      else if (hash(x * 73 + y * 311) > 0.97) col = shade(col, 1.12);
      const n = parseInt(col.slice(1), 16);
      const o = (y * MAP_W + x) * 4;
      d[o] = n >> 16;
      d[o + 1] = (n >> 8) & 255;
      d[o + 2] = n & 255;
    }
  c.putImageData(img, 0, 0);
}

/** Surf along the beach and rocks in the shallows. */
function coast(c: Ctx): void {
  for (let y = 1; y < MAP_H - 1; y += 1)
    for (let x = 1; x < MAP_W - 1; x += 1) {
      if (onLand(x, y, -3) || !onLand(x, y, -6)) continue;
      if (hash(x * 17 + y * 61) > 0.55) rect(c, '#d8ecf8', x, y, 1, 1, 0.8);
    }
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(hash(i * 41 + 7) * MAP_W);
    const y = Math.floor(hash(i * 41 + 8) * MAP_H);
    if (onLand(x, y, -9) || !onLand(x, y, -16)) continue;
    rect(c, '#6d7480', x, y, 3, 2);
    rect(c, '#9aa2ad', x, y, 2, 1);
    rect(c, '#d8ecf8', x - 1, y + 2, 5, 1, 0.7);
  }
  // Islets and boats out at sea.
  for (const [x, y, r] of [
    [22, 36, 7],
    [364, 28, 6],
    [356, 160, 5],
  ] as const) {
    ellipse(c, '#d8ecf8', x, y, r + 2, r * 0.6 + 2, 0.6);
    ellipse(c, SAND, x, y, r, r * 0.6);
    ellipse(c, '#5fa24c', x, y - 1, r - 2, r * 0.6 - 2);
    palm(c, x + 1, y);
  }
  for (const [x, y, flip] of [
    [14, 186, 1],
    [52, 196, -1],
    [372, 96, -1],
    [330, 200, 1],
    [70, 12, 1],
  ] as const)
    boat(c, x, y, flip);
}

function palm(c: Ctx, x: number, y: number): void {
  line(c, '#7a5230', x, y, x + 1, y - 6);
  rect(c, '#2f7d3a', x - 2, y - 7, 6, 1);
  rect(c, '#2f7d3a', x - 1, y - 8, 4, 1);
  rect(c, '#3f9a48', x - 3, y - 6, 2, 1);
  rect(c, '#3f9a48', x + 3, y - 6, 2, 1);
}

function boat(c: Ctx, x: number, y: number, flip: number): void {
  rect(c, '#d8ecf8', x - 6 * flip - (flip < 0 ? 4 : 0), y + 2, 5, 1, 0.6);
  trap(c, '#7a4a2a', y, y + 2, x - 3, x + 4, x - 2, x + 3);
  line(c, '#e8e2d0', x, y - 6, x, y);
  trap(c, '#f6f2e6', y - 6, y - 1, x + flip, x + flip + 1, x + flip, x + flip * 4 + 1);
}

/** Rounded hills with sunlit tops and a shadowed foot. */
function hills(c: Ctx, keep: Keep): void {
  const spots: [number, number, number][] = [
    [60, 62, 13],
    [86, 50, 10],
    [188, 24, 12],
    [212, 30, 9],
    [338, 62, 11],
    [176, 74, 9],
    [92, 74, 8],
    [312, 166, 10],
    [242, 176, 9],
  ];
  for (const [x, y, r] of spots) {
    if (!keep(x - r, y - r * 0.55, r * 2, r * 1.1)) continue;
    ellipse(c, '#3f7a36', x + 1, y + 2, r, r * 0.55);
    ellipse(c, '#5fa24c', x, y, r, r * 0.55);
    ellipse(c, '#77b75c', x - r * 0.25, y - r * 0.15, r * 0.6, r * 0.32);
    ellipse(c, '#93cc74', x - r * 0.35, y - r * 0.25, r * 0.25, r * 0.12);
  }
}

/** Where the river runs, from the glacier tarn down to the south coast. */
const RIVER: [number, number][] = [
  [256, 64],
  [244, 74],
  [226, 80],
  [206, 90],
  [192, 108],
  [178, 126],
  [168, 148],
  [158, 172],
  [150, 200],
];

/** River, lakes and the bridges where the road crosses water. */
function water(c: Ctx, keep: Keep): void {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [x0, y0] = RIVER[i]!;
    const [x1, y1] = RIVER[i + 1]!;
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const wob = Math.sin((i * steps + s) * 0.35) * 1.5;
      pts.push({ x: x0 + (x1 - x0) * t + wob, y: y0 + (y1 - y0) * t });
    }
  }
  // Banks, then water, then a glint down the middle.
  pts.forEach((p, i) => {
    const w = 2 + Math.min(2, i / 60);
    rect(c, '#3c7a3a', p.x - w / 2 - 1, p.y - 1, w + 2, 3);
  });
  pts.forEach((p, i) => {
    const w = 2 + Math.min(2, i / 60);
    rect(c, '#3f78b8', p.x - w / 2, p.y, w, 2);
  });
  pts.forEach((p, i) => {
    if (i % 5 < 2) rect(c, '#8fc0ea', p.x, p.y, 1, 1);
  });

  // The glacier tarn the river starts from.
  ellipse(c, '#cfe4f0', 258, 64, 8, 4);
  ellipse(c, '#6fa8d8', 258, 64, 6, 3);

  // A lake in the western hills, with reeds and a jetty.
  ellipse(c, '#3c7a3a', 70, 95, 17, 10);
  ellipse(c, '#e3cf98', 70, 94, 16, 9);
  ellipse(c, '#3f78b8', 70, 94, 14, 7);
  ellipse(c, '#4f88c6', 67, 92, 7, 3);
  for (let i = 0; i < 9; i++) rect(c, '#8fc0ea', 60 + i * 2.5, 93 + ((i * 3) % 4), 2, 1);
  for (const [x, y] of [
    [57, 97],
    [59, 99],
    [82, 98],
    [84, 96],
  ] as const)
    for (let k = 0; k < 3; k++) rect(c, '#2f6a34', x + k, y - (k % 2) - 2, 1, 3);
  rect(c, '#8a5a32', 74, 100, 2, 5);
  rect(c, '#a8743f', 73, 99, 4, 1);

  // Bridges where the road meets the river.
  const bridges: { x: number; y: number }[] = [];
  for (let leg = 0; leg < LEGS.length; leg++)
    for (const p of legPoints(leg)) {
      if (!pts.some((q) => Math.abs(q.x - p.x) < 2.5 && Math.abs(q.y - p.y) < 2.5)) continue;
      if (bridges.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 10)) continue;
      bridges.push(p);
      rect(c, '#6b4426', p.x - 4, p.y - 3, 8, 6);
      rect(c, '#b07a45', p.x - 3, p.y - 2, 6, 4);
      rect(c, '#8a5a32', p.x - 3, p.y, 6, 1);
    }
  void keep;
}

function tree(c: Ctx, x: number, y: number, hue: number): void {
  const greens = ['#2f7a34', '#3b8a3a', '#4a8f2f'];
  const g = greens[hue % greens.length]!;
  rect(c, '#5a3b22', x, y - 1, 1, 2);
  ellipse(c, shade(g, 0.7), x + 0.5, y - 3, 3, 2.5);
  ellipse(c, g, x, y - 4, 2.5, 2);
  rect(c, shade(g, 1.35), x - 1, y - 5, 1, 1);
}

function house(c: Ctx, x: number, y: number, roof: string): void {
  rect(c, '#2a2016', x - 1, y - 4, 7, 5);
  rect(c, '#efe4cc', x, y - 4, 5, 4);
  trap(c, roof, y - 7, y - 4, x + 2, x + 3, x - 1, x + 6);
  rect(c, '#5a3b22', x + 2, y - 2, 1, 2);
  rect(c, '#7fb8e0', x + 4, y - 3, 1, 1);
}

function windmill(c: Ctx, x: number, y: number): void {
  trap(c, '#e8dcc0', y - 9, y, x, x + 3, x - 1, x + 4);
  rect(c, '#9a4a32', x, y - 10, 3, 2);
  line(c, '#6b4426', x - 3, y - 13, x + 5, y - 5);
  line(c, '#6b4426', x - 3, y - 5, x + 5, y - 13);
}

/** A field: a hedge, then rows of crop. */
function field(c: Ctx, x: number, y: number, w: number, h: number, kind: number): void {
  const crops = [
    ['#d9c25a', '#c4ab45'],
    ['#8a6a42', '#75583a'],
    ['#82b452', '#6c9c42'],
    ['#a08cc8', '#8a76b4'],
  ];
  const [a, b] = crops[kind % crops.length]!;
  rect(c, '#3c7234', x - 1, y - 1, w + 2, h + 2);
  rect(c, a!, x, y, w, h);
  for (let r = y + 1; r < y + h; r += 2) rect(c, b!, x, r, w, 1);
}

/** Farms, a village, woods, rocks, bushes and flowers on the free ground. */
function decorate(c: Ctx, keep: Keep): void {
  // Patchwork farmland.
  const fields: [number, number, number, number][] = [
    [96, 150, 18, 10],
    [116, 152, 14, 12],
    [96, 163, 22, 8],
    [234, 98, 16, 9],
    [252, 100, 14, 12],
    [236, 110, 20, 7],
    [268, 158, 18, 9],
    [288, 160, 14, 12],
    [268, 170, 22, 7],
    [190, 170, 16, 9],
    [70, 116, 14, 8],
  ];
  fields.forEach(([x, y, w, h], i) => {
    if (keep(x - 1, y - 1, w + 2, h + 2)) field(c, x, y, w, h, i);
  });

  // A village by the river, with a windmill.
  const roofs = ['#b8473a', '#c9663d', '#8a4a6a', '#3d6fb0'];
  [
    [206, 70],
    [214, 66],
    [222, 70],
    [210, 78],
    [230, 64],
    [52, 76],
    [44, 82],
    [300, 150],
    [308, 146],
  ].forEach(([x, y], i) => {
    if (keep(x! - 1, y! - 7, 8, 8)) house(c, x!, y!, roofs[i % roofs.length]!);
  });
  for (const [x, y] of [
    [198, 78],
    [282, 150],
  ] as const)
    if (keep(x - 3, y - 13, 9, 14)) windmill(c, x, y);

  // Woods: clumps of round trees.
  const woods: [number, number, number, number][] = [
    [342, 82, 16, 10],
    [330, 150, 14, 9],
    [56, 42, 18, 9],
    [96, 34, 12, 8],
    [180, 90, 10, 6],
    [244, 186, 14, 7],
    [116, 176, 14, 7],
    [304, 72, 10, 7],
  ];
  woods.forEach(([cx, cy, rx, ry], w) => {
    for (let i = 0; i < 22; i++) {
      const a = hash(w * 211 + i * 3) * Math.PI * 2;
      const r = Math.sqrt(hash(w * 211 + i * 3 + 1));
      const x = Math.round(cx + Math.cos(a) * rx * r);
      const y = Math.round(cy + Math.sin(a) * ry * r);
      if (keep(x - 3, y - 6, 7, 8)) tree(c, x, y, i + w);
    }
  });

  // Scattered trees, rocks, bushes and flowers over the rest.
  for (let i = 0; i < 1500; i++) {
    const x = Math.floor(hash(i * 5 + 101) * MAP_W);
    const y = Math.floor(hash(i * 5 + 102) * MAP_H);
    const kind = hash(i * 5 + 103);
    if (kind < 0.08) {
      if (keep(x - 3, y - 6, 7, 8)) tree(c, x, y, i);
    } else if (kind < 0.16) {
      if (keep(x - 1, y - 1, 5, 4)) {
        rect(c, '#5d636e', x, y, 4, 2);
        rect(c, '#9aa2ad', x, y, 3, 1);
        rect(c, '#3f7a36', x - 1, y + 2, 6, 1);
      }
    } else if (kind < 0.3) {
      if (keep(x - 1, y - 1, 5, 3)) {
        rect(c, '#2f6a34', x, y, 4, 2);
        rect(c, '#4a8f3f', x + 1, y, 2, 1);
      }
    } else if (kind < 0.45) {
      if (keep(x - 1, y - 2, 4, 3)) {
        rect(c, '#3f7a36', x, y - 1, 1, 2);
        rect(c, '#3f7a36', x + 2, y - 1, 1, 2);
        rect(c, '#3f7a36', x + 1, y, 1, 1);
      }
    } else if (kind < 0.7) {
      if (keep(x, y, 1, 1)) {
        const f = ['#ffffff', '#ffd84a', '#ff7aa8', '#c8a0ff'];
        rect(c, f[i % f.length]!, x, y, 1, 1);
      }
    }
  }
}

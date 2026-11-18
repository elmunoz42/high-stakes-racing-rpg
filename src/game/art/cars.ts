import {
  type Ctx,
  ellipse,
  finish,
  type FinishOptions,
  glow,
  makeCanvas,
  rect,
  shade,
  tone,
  trap,
} from './pixel.ts';

export type Body = 'roadster' | 'coupe' | 'hatch';

export const CAR_W = 152;
export const CAR_H = 48;
export const SIDE_W = 84;
export const SIDE_H = 30;

const TYRE = '#15151b';
const GLASS = '#22324a';
const GLASS_HI = '#5b7fa8';

/**
 * Finishes a sprite: volume shading, rim light and a coloured outline (see
 * `finish` in pixel.ts). Every sprite in the game ends with this call.
 */
export function outline(c: Ctx, w: number, h: number, _color?: string, opts?: FinishOptions): void {
  finish(c, w, h, opts);
}

/**
 * Rear view for the race, as a tiny 3D model: a long, low body box, a cabin
 * that is narrower than the body and tapers to the roof, wheels, mirrors and
 * a spoiler, turned by the yaw frame and projected with the race camera's
 * look from behind and above. Lamps, bumper, plate and exhausts are decals on
 * the rear face. Shaded by hand in tone ramps: tops lit, the rear in light,
 * the flank in shade.
 *
 * `frame` is -2..2: how far the car is yawed (negative = nose left). The
 * texture is CAR_W x CAR_H with the car's rear centred; a turned car's flank
 * fills the space to one side.
 */
export function drawCarRear(
  c: Ctx,
  body: Body,
  color: string,
  frame: number,
  braking: boolean,
): void {
  const f = Math.max(-2, Math.min(2, Math.round(frame)));
  const yaw = YAW[Math.abs(f)]!;
  let lamps: [number, number][];
  if (f >= 0) lamps = drawModel(c, body, color, yaw, braking);
  else {
    // A left turn is the mirror image of a right one.
    const m = makeCanvas(CAR_W, CAR_H);
    lamps = drawModel(m.ctx, body, color, yaw, braking).map(([x, y]) => [CAR_W - x, y]);
    c.save();
    c.translate(CAR_W, 0);
    c.scale(-1, 1);
    c.drawImage(m.canvas, 0, 0);
    c.restore();
  }
  finish(c, CAR_W, CAR_H, { volume: false });

  // Shadow: the car's footprint on the road, drawn behind everything.
  c.globalCompositeOperation = 'destination-over';
  const fp: V3[] = [
    [-1.05, 0, -0.15],
    [1.05, 0, -0.15],
    [1.05, 0, 4.55],
    [-1.05, 0, 4.55],
  ];
  const yawS = f < 0 ? -yaw : yaw;
  fillPoly(
    c,
    fp.map((v) => project(v, yawS)),
    '#000000',
    0.42,
  );
  c.globalCompositeOperation = 'source-over';

  if (braking) for (const [x, y] of lamps) glow(c, '#ff4030', x, y, 12, 0.6);
}

/** Texture size of a race car, and the width of its rear at frame 0. */
export const CAR_FACE_W = 80;

/** Yaw for frames 0, 1 and 2, radians (about 0, 11 and 22 degrees). */
const YAW = [0, 0.19, 0.38];

/** The race camera, fitted so the rear is CAR_FACE_W wide at frame 0. */
const CAM = { dist: 9, fx: 379, fy: 300, height: 2.0, cy: -22.7 };
/** Body: half width, sill, shoulder, length (m). */
const BODY = { hw: 0.95, y0: 0.2, y1: 0.8, len: 4.4 };

type V3 = [number, number, number];
type P2 = [number, number];

/** Car-local point (x right, y up, z forward from the rear bumper) to texture pixels. */
function project([x, y, z]: V3, yaw: number): P2 {
  const s = Math.sin(yaw);
  const co = Math.cos(yaw);
  const wx = x * co + z * s;
  const wz = -x * s + z * co;
  const d = wz + CAM.dist;
  return [CAR_W / 2 + (CAM.fx * wx) / d, CAM.cy + (CAM.fy * (CAM.height - y)) / d];
}

/** Whether a face with this car-local outward normal, through point p, faces the camera. */
function facing(n: V3, p: V3, yaw: number): boolean {
  const s = Math.sin(yaw);
  const co = Math.cos(yaw);
  const nx = n[0] * co + n[2] * s;
  const nz = -n[0] * s + n[2] * co;
  const px = p[0] * co + p[2] * s;
  const pz = -p[0] * s + p[2] * co;
  return nx * px + n[1] * (p[1] - CAM.height) + nz * (pz + CAM.dist) < 0;
}

/** Crisp scanline polygon fill. */
function fillPoly(c: Ctx, pts: P2[], color: string, alpha = 1): void {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.ceil(Math.min(...ys) - 0.5);
  const y1 = Math.floor(Math.max(...ys) - 0.5);
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]!;
      const [bx, by] = pts[(i + 1) % pts.length]!;
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc))
        xs.push(ax + ((yc - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const l = Math.round(xs[i]!);
      const r = Math.round(xs[i + 1]!);
      if (r > l) rect(c, color, l, y, r - l, 1, alpha);
    }
  }
}

const lerp3 = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * A quad in car space (corners in order, top edge first), filled in `bands`
 * strips from top to bottom, coloured by `col(v)` with v 0 at the top edge.
 */
function quad(
  c: Ctx,
  yaw: number,
  [a, b, cc, d]: [V3, V3, V3, V3],
  col: (v: number) => string,
  bands = 1,
  alpha = 1,
): void {
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    const pts: V3[] = [lerp3(a, d, t0), lerp3(b, cc, t0), lerp3(b, cc, t1), lerp3(a, d, t1)];
    fillPoly(
      c,
      pts.map((v) => project(v, yaw)),
      col(bands === 1 ? 0 : i / (bands - 1)),
      alpha,
    );
  }
}

/** A rectangle on the rear face (z = 0) from x0..x1, y0..y1, and its mirror if `pair`. */
function decal(
  c: Ctx,
  yaw: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  col: string | ((v: number) => string),
  pair = false,
  bands = 1,
  alpha = 1,
): void {
  const z = -0.002;
  const fn = typeof col === 'string' ? () => col : col;
  for (const [l, r] of pair
    ? [
        [x0, x1],
        [-x1, -x0],
      ]
    : [[x0, x1]])
    quad(
      c,
      yaw,
      [
        [l!, y1, z],
        [r!, y1, z],
        [r!, y0, z],
        [l!, y0, z],
      ],
      fn,
      bands,
      alpha,
    );
}

/** A disc on a plane x = px (a wheel seen from the side), as a projected polygon. */
function disc(
  c: Ctx,
  yaw: number,
  px: number,
  cy: number,
  cz: number,
  r: number,
  col: string,
): void {
  const pts: P2[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    pts.push(project([px, cy + Math.sin(a) * r, cz + Math.cos(a) * r], yaw));
  }
  fillPoly(c, pts, col);
}

/** Draws the model turned right by `yaw`; returns where the two tail lamps are. */
function drawModel(c: Ctx, body: Body, color: string, yaw: number, braking: boolean): P2[] {
  const t = (k: number) => tone(color, k);
  const { hw, y0, y1, len } = BODY;
  const side = yaw > 0.01;
  const wheels = [0.85, 3.55];

  // Rear tyres under the bumper, and the dark underbody between them.
  quad(
    c,
    yaw,
    [
      [-0.7, 0.24, 0.3],
      [0.7, 0.24, 0.3],
      [0.7, 0.03, 0.3],
      [-0.7, 0.03, 0.3],
    ],
    () => '#0c0c12',
  );
  for (const sx of [-1, 1]) {
    const xa = sx * 0.6;
    const xb = sx * 0.93;
    quad(
      c,
      yaw,
      [
        [xa, 0.62, 0.6],
        [xb, 0.62, 0.6],
        [xb, 0, 0.6],
        [xa, 0, 0.6],
      ],
      (v) => (v < 0.6 ? '#2c2c36' : v < 0.85 ? '#1c1c24' : '#0e0e14'),
      4,
    );
  }

  // Body flank (in shade), with wheel arches, wheels, door line and handle.
  if (side && facing([1, 0, 0], [hw, 0.5, 2], yaw)) {
    quad(
      c,
      yaw,
      [
        [hw, y1, 0],
        [hw, y1, len],
        [hw, y0, len],
        [hw, y0, 0],
      ],
      (v) => t(1.1 - v * 0.5),
      5,
    );
    quad(
      c,
      yaw,
      [
        [hw, y1, 0],
        [hw, y1, len],
        [hw, y1 - 0.04, len],
        [hw, y1 - 0.04, 0],
      ],
      () => t(1.45),
    );
    quad(
      c,
      yaw,
      [
        [hw, 0.42, 0],
        [hw, 0.42, len],
        [hw, 0.4, len],
        [hw, 0.4, 0],
      ],
      () => t(0.55),
    );
    for (const z of wheels) {
      disc(c, yaw, hw + 0.001, 0.31, z, 0.37, '#0c0c12');
      disc(c, yaw, hw + 0.002, 0.31, z, 0.31, '#24242c');
      disc(c, yaw, hw + 0.003, 0.31, z, 0.19, '#9a9aa8');
      disc(c, yaw, hw + 0.004, 0.31, z, 0.07, '#4a4a56');
    }
    quad(
      c,
      yaw,
      [
        [hw + 0.004, y1 - 0.06, 2.3],
        [hw + 0.004, y1 - 0.06, 2.33],
        [hw + 0.004, 0.44, 2.33],
        [hw + 0.004, 0.44, 2.3],
      ],
      () => t(0.45),
    );
    quad(
      c,
      yaw,
      [
        [hw + 0.004, 0.7, 1.95],
        [hw + 0.004, 0.7, 2.15],
        [hw + 0.004, 0.67, 2.15],
        [hw + 0.004, 0.67, 1.95],
      ],
      () => '#e0e0ea',
    );
  }

  // Rear face: lit from above, banded.
  quad(
    c,
    yaw,
    [
      [-hw, y1, 0],
      [hw, y1, 0],
      [hw, y0, 0],
      [-hw, y0, 0],
    ],
    (v) => t(1.25 - v * 0.55),
    6,
  );
  // Top of the body: boot lid and bonnet catch the sky.
  quad(
    c,
    yaw,
    [
      [-hw, y1, len],
      [hw, y1, len],
      [hw, y1, 0],
      [-hw, y1, 0],
    ],
    (v) => t(1.2 + v * 0.2),
    3,
  );

  // Rear decals.
  decal(c, yaw, -hw, hw, 0.76, y1, t(1.45));
  decal(c, yaw, -0.7, -0.05, 0.73, 0.75, '#fff0f4', false, 1, 0.35); // sky glint
  decal(c, yaw, -hw, hw, 0.53, 0.545, t(0.55)); // crease
  decal(c, yaw, -hw, hw, 0.515, 0.53, t(1.2));
  decal(c, yaw, -hw, hw, y0, 0.36, (v) => t(0.9 - v * 0.25), false, 3); // bumper
  decal(c, yaw, -0.82, 0.82, y0, 0.26, '#1e1e26'); // diffuser
  for (let x = -0.7; x <= 0.7; x += 0.2) decal(c, yaw, x, x + 0.05, y0, 0.25, '#0e0e14');
  decal(c, yaw, -0.21, 0.21, 0.28, 0.45, '#8c8c98'); // plate frame
  decal(c, yaw, -0.18, 0.18, 0.3, 0.43, (v) => tone('#f2f0e4', 1.06 - v * 0.15), false, 2);
  for (const x of [-0.13, -0.05, 0.03, 0.11]) decal(c, yaw, x, x + 0.04, 0.33, 0.4, '#3a3a48');
  decal(c, yaw, -0.08, 0.08, 0.455, 0.47, '#fff8d8'); // plate lamp
  decal(c, yaw, 0.72, 0.86, 0.3, 0.33, '#c0202a', true); // reflectors
  // Exhausts: chrome tips with dark mouths.
  for (const x of body === 'coupe' ? [0.45, 0.62] : [0.55]) {
    decal(c, yaw, x, x + 0.12, 0.2, 0.28, '#5c5c68');
    decal(c, yaw, x, x + 0.12, 0.265, 0.28, '#e0e0ec');
    decal(c, yaw, x + 0.03, x + 0.09, 0.21, 0.255, '#0a0a0e');
  }
  // Tail lamps: chrome-topped housings, red segments, amber indicators.
  decal(c, yaw, 0.44, 0.93, 0.56, 0.74, '#24242a', true);
  decal(c, yaw, 0.44, 0.93, 0.725, 0.74, '#c4c4d0', true);
  for (let k = 0; k < 3; k++) {
    const x = 0.47 + k * 0.11;
    decal(
      c,
      yaw,
      x,
      x + 0.095,
      0.58,
      0.715,
      (v) => tone(braking ? '#ff3a2c' : '#9a1818', braking ? 1.5 - v * 0.5 : 1.15 - v * 0.45),
      true,
      3,
    );
    decal(c, yaw, x + 0.03, x + 0.05, 0.66, 0.69, braking ? '#fff0e8' : '#ff6a58', true);
  }
  decal(c, yaw, 0.81, 0.9, 0.58, 0.715, (v) => tone('#f2a23a', 1.25 - v * 0.4), true, 2);
  if (body === 'coupe') {
    // A lit bar between the lamps, a 90s touch.
    decal(c, yaw, -0.42, 0.42, 0.6, 0.7, braking ? '#c8281e' : '#4a0e10');
    decal(c, yaw, -0.42, 0.42, 0.685, 0.7, braking ? '#ff7a64' : '#7a1c1c');
  }
  if (body === 'hatch') decal(c, yaw, -hw, hw, 0.5, 0.515, '#d02040'); // pinstripe

  // Cabin.
  if (body === 'roadster') roadsterCockpit(c, yaw, t);
  else cabin(c, yaw, body, t, braking);

  // Door mirrors.
  for (const sx of [-1, 1]) {
    const xa = sx * hw;
    const xb = sx * (hw + 0.14);
    quad(
      c,
      yaw,
      [
        [xa, 0.98, 2.85],
        [xb, 0.98, 2.85],
        [xb, 0.86, 2.85],
        [xa, 0.86, 2.85],
      ],
      (v) => t(1.2 - v * 0.5),
      2,
    );
    quad(
      c,
      yaw,
      [
        [xa, 0.98, 2.95],
        [xb, 0.98, 2.95],
        [xb, 0.98, 2.85],
        [xa, 0.98, 2.85],
      ],
      () => t(1.4),
    );
  }

  return [project([-0.68, 0.65, 0], yaw), project([0.68, 0.65, 0], yaw)];
}

/** A tapered glasshouse for coupes and hatches: rear glass, side glass, roof. */
function cabin(c: Ctx, yaw: number, body: Body, t: (k: number) => string, braking: boolean): void {
  const yb = BODY.y1;
  const yt = 1.16;
  const wb = 0.78;
  const wt = 0.6;
  // Rear glass leans forward: bottom edge at zb0, top edge at zt0.
  const [zb0, zt0, zt1, zb1] = body === 'coupe' ? [0.95, 1.6, 2.55, 3.05] : [0.3, 0.45, 2.45, 2.95];
  const glassCol = (v: number) =>
    v < 0.25 ? '#8aa8d0' : v < 0.5 ? '#4e6c96' : v < 0.75 ? '#2c3e60' : '#1a2438';

  // Right side glass, in a body-coloured frame.
  if (facing([1, 0.3, 0], [wb, (yb + yt) / 2, (zb0 + zb1) / 2], yaw)) {
    quad(
      c,
      yaw,
      [
        [wt, yt, zt0],
        [wt, yt, zt1],
        [wb, yb, zb1],
        [wb, yb, zb0],
      ],
      (v) => t(0.95 - v * 0.2),
      2,
    );
    const inset = (a: V3, b: V3, k: number) => lerp3(a, b, k);
    const A: V3 = [wt, yt, zt0];
    const B: V3 = [wt, yt, zt1];
    const C: V3 = [wb, yb, zb1];
    const D: V3 = [wb, yb, zb0];
    const top0 = inset(A, D, 0.18);
    const top1 = inset(B, C, 0.18);
    const bot0 = inset(A, D, 0.92);
    const bot1 = inset(B, C, 0.92);
    const s0 = (p: V3, q: V3, k: number) => lerp3(p, q, k);
    quad(
      c,
      yaw,
      [s0(top0, top1, 0.08), s0(top0, top1, 0.92), s0(bot0, bot1, 0.92), s0(bot0, bot1, 0.08)],
      glassCol,
      4,
    );
    // B-pillar.
    quad(
      c,
      yaw,
      [s0(top0, top1, 0.55), s0(top0, top1, 0.6), s0(bot0, bot1, 0.6), s0(bot0, bot1, 0.55)],
      () => t(0.6),
    );
  }
  // Rear glass in its frame.
  quad(
    c,
    yaw,
    [
      [-wt, yt, zt0],
      [wt, yt, zt0],
      [wb, yb, zb0],
      [-wb, yb, zb0],
    ],
    () => t(0.9),
  );
  const g0: V3 = [-wt + 0.06, yt - 0.03, zt0 - 0.03];
  const g1: V3 = [wt - 0.06, yt - 0.03, zt0 - 0.03];
  const g2: V3 = [wb - 0.07, yb + 0.03, zb0 + 0.03];
  const g3: V3 = [-wb + 0.07, yb + 0.03, zb0 + 0.03];
  quad(c, yaw, [g0, g1, g2, g3], glassCol, 5);
  // Headrests through the glass, and a glare streak.
  for (const x of [-0.42, 0.18]) {
    quad(
      c,
      yaw,
      [
        lerp3(g0, g1, (x + 0.6) / 1.2),
        lerp3(g0, g1, (x + 0.84) / 1.2),
        lerp3(g3, g2, (x + 0.84) / 1.2),
        lerp3(g3, g2, (x + 0.6) / 1.2),
      ].map((p, i) => (i < 2 ? lerp3(p, i === 0 ? g3 : g2, 0.45) : p)) as [V3, V3, V3, V3],
      () => '#0e121c',
    );
  }
  quad(
    c,
    yaw,
    [lerp3(g0, g1, 0.1), lerp3(g0, g1, 0.16), lerp3(g3, g2, 0.32), lerp3(g3, g2, 0.26)],
    () => '#dcecff',
    1,
    0.55,
  );
  // Roof, lit.
  quad(
    c,
    yaw,
    [
      [-wt, yt, zt1],
      [wt, yt, zt1],
      [wt, yt, zt0],
      [-wt, yt, zt0],
    ],
    (v) => t(1.3 + v * 0.15),
    2,
  );
  quad(
    c,
    yaw,
    [
      [-wt, yt, zt0 + 0.05],
      [wt, yt, zt0 + 0.05],
      [wt, yt, zt0],
      [-wt, yt, zt0],
    ],
    () => t(1.55),
  );

  if (body === 'coupe') {
    // Ducktail spoiler on struts.
    for (const x of [-0.6, 0.6])
      quad(
        c,
        yaw,
        [
          [x - 0.04, 0.95, 0.15],
          [x + 0.04, 0.95, 0.15],
          [x + 0.04, 0.8, 0.15],
          [x - 0.04, 0.8, 0.15],
        ],
        () => t(0.5),
      );
    quad(
      c,
      yaw,
      [
        [-0.9, 0.99, 0.05],
        [0.9, 0.99, 0.05],
        [0.9, 0.93, 0.05],
        [-0.9, 0.93, 0.05],
      ],
      (v) => t(1.1 - v * 0.4),
      2,
    );
    quad(
      c,
      yaw,
      [
        [-0.9, 0.99, 0.35],
        [0.9, 0.99, 0.35],
        [0.9, 0.99, 0.05],
        [-0.9, 0.99, 0.05],
      ],
      () => t(1.5),
    );
  } else {
    // Roof spoiler and a high brake light over the hatch glass.
    quad(
      c,
      yaw,
      [
        [-wt, yt + 0.04, zt0 - 0.12],
        [wt, yt + 0.04, zt0 - 0.12],
        [wt, yt - 0.03, zt0 - 0.12],
        [-wt, yt - 0.03, zt0 - 0.12],
      ],
      (v) => t(1.2 - v * 0.5),
      2,
    );
    quad(
      c,
      yaw,
      [
        [-0.15, yt - 0.04, zt0 - 0.11],
        [0.15, yt - 0.04, zt0 - 0.11],
        [0.15, yt - 0.07, zt0 - 0.11],
        [-0.15, yt - 0.07, zt0 - 0.11],
      ],
      () => (braking ? '#ff6a58' : '#6a1414'),
    );
  }
}

/** Open cockpit: dark tub, roll hoops, headrests, the driver's helmet, a windscreen. */
function roadsterCockpit(c: Ctx, yaw: number, t: (k: number) => string): void {
  const y = BODY.y1 + 0.001;
  quad(
    c,
    yaw,
    [
      [-0.72, y, 2.45],
      [0.72, y, 2.45],
      [0.72, y, 0.95],
      [-0.72, y, 0.95],
    ],
    () => '#16161c',
  );
  // Windscreen: a frame and tinted glass, leaning back.
  quad(
    c,
    yaw,
    [
      [-0.74, 1.12, 2.35],
      [0.74, 1.12, 2.35],
      [0.78, y, 2.6],
      [-0.78, y, 2.6],
    ],
    () => '#9cc4e4',
    1,
    0.45,
  );
  quad(
    c,
    yaw,
    [
      [-0.74, 1.12, 2.35],
      [0.74, 1.12, 2.35],
      [0.74, 1.08, 2.37],
      [-0.74, 1.08, 2.37],
    ],
    () => t(0.45),
  );
  for (const x of [-0.36, 0.36]) {
    // Roll hoop, then headrest.
    quad(
      c,
      yaw,
      [
        [x - 0.2, 1.1, 1.05],
        [x + 0.2, 1.1, 1.05],
        [x + 0.2, y, 1.05],
        [x - 0.2, y, 1.05],
      ],
      (v) => tone('#b8b8c8', 1.3 - v * 0.5),
      3,
    );
    quad(
      c,
      yaw,
      [
        [x - 0.14, 1.08, 1.15],
        [x + 0.14, 1.08, 1.15],
        [x + 0.14, y, 1.15],
        [x - 0.14, y, 1.15],
      ],
      (v) => tone('#2a2a34', 1.2 - v * 0.4),
      2,
    );
  }
  // Helmet: white shell with a red stripe and a glint.
  const [hx, hy] = project([-0.36, 1.2, 1.4], yaw);
  ellipse(c, tone('#f1efe6', 0.75), hx, hy + 1, 4, 4);
  ellipse(c, '#f6f4ec', hx, hy, 3.5, 3.2);
  rect(c, '#d7263d', hx - 4, hy, 8, 1);
  rect(c, '#ffffff', hx - 2, hy - 2, 2, 1);
}

/** Side view, nose to the right, for the town and garage. */
export function drawCarSide(c: Ctx, body: Body, color: string): void {
  const hi = shade(color, 1.25);
  const lo = shade(color, 0.7);
  // Body.
  trap(c, color, 13, 17, 5, 80, 3, 81);
  rect(c, color, 3, 17, 78, 5);
  rect(c, hi, 6, 13, 73, 1);
  rect(c, lo, 3, 20, 78, 2);
  rect(c, '#1a1a22', 6, 22, 72, 1);
  if (body === 'coupe') {
    trap(c, color, 5, 13, 30, 46, 14, 60);
    trap(c, GLASS, 6, 12, 31, 45, 19, 57);
    rect(c, color, 38, 6, 2, 7);
    trap(c, GLASS_HI, 7, 10, 41, 45, 41, 50, 0.8);
  } else if (body === 'hatch') {
    trap(c, color, 4, 13, 12, 46, 9, 56);
    trap(c, GLASS, 5, 12, 14, 45, 12, 53);
    rect(c, color, 28, 5, 2, 8);
    rect(c, color, 42, 5, 2, 8);
    trap(c, GLASS_HI, 6, 9, 31, 36, 31, 39, 0.8);
    rect(c, '#b0162c', 3, 16, 78, 1);
  } else {
    trap(c, '#7fb2d6', 6, 13, 47, 49, 43, 52, 0.7);
    rect(c, shade(color, 0.5), 46, 6, 1, 7);
    rect(c, '#22222b', 34, 9, 5, 4);
    ellipse(c, '#f1efe6', 39, 8, 3, 3);
    rect(c, '#9a9aa8', 30, 8, 1, 5);
  }
  // Lights and trim.
  rect(c, '#ffe9a8', 78, 14, 3, 3);
  rect(c, '#c81e1e', 3, 14, 2, 3);
  rect(c, shade(color, 0.55), 44, 14, 1, 7);
  rect(c, '#d9d9e2', 47, 16, 3, 1);
  // Wheels.
  for (const x of [19, 64]) {
    ellipse(c, lo, x, 22, 8, 7);
    ellipse(c, TYRE, x, 23, 6, 6);
    ellipse(c, '#b9b9c6', x, 23, 3, 3);
    rect(c, '#55555f', x - 1, 22, 2, 2);
  }
  outline(c, SIDE_W, SIDE_H);
  c.globalCompositeOperation = 'destination-over';
  ellipse(c, '#000000', 42, 28, 38, 2, 0.35);
  c.globalCompositeOperation = 'source-over';
}

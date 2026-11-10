import { outline } from './cars.ts';
import {
  type Ctx,
  bands,
  ellipse,
  glow,
  hash,
  line,
  mix,
  rect,
  shade,
  text,
  trap,
} from './pixel.ts';

/**
 * Roadside scenery and sky for the race, drawn at dusk. Each entry is
 * [width, height, draw]. Sizes are texture pixels; world sizes live in
 * src/race/projection.ts (SPRITE_METERS).
 */
type Art = [number, number, (c: Ctx) => void];

const WINDOW = '#ffd27a';

function windows(
  c: Ctx,
  x: number,
  y: number,
  cols: number,
  rows: number,
  dx: number,
  dy: number,
  seed: number,
  w = 3,
  h = 4,
): void {
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const lit = hash(seed + r * 31 + k * 7) > 0.45;
      rect(c, lit ? WINDOW : '#3a3552', x + k * dx, y + r * dy, w, h);
    }
}

function frond(c: Ctx, cx: number, cy: number, dx: number, dy: number, color: string): void {
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = cx + dx * t;
    const y = cy + dy * t + 9 * t * t;
    rect(c, color, x - 1, y, 3, 2 + Math.round(3 * (1 - t)));
  }
}

export const SCENERY: Record<string, Art> = {
  lamp: [
    16,
    72,
    (c) => {
      rect(c, '#2a2c38', 7, 8, 2, 64);
      rect(c, '#3b3e4d', 6, 66, 4, 6);
      rect(c, '#2a2c38', 2, 6, 9, 2);
      rect(c, '#fff3c4', 1, 8, 6, 2);
      outline(c, 16, 72);
      glow(c, '#ffe08a', 4, 10, 9, 0.75);
    },
  ],
  palm: [
    48,
    84,
    (c) => {
      for (let i = 0; i < 26; i++) {
        const x = 22 + Math.round(Math.sin(i / 9) * 3);
        rect(c, i % 3 ? '#8a6238' : '#6e4c2a', x, 30 + i * 2, 5, 2);
      }
      const g = ['#1f7a3e', '#2a9450', '#176233'];
      frond(c, 24, 26, -22, -8, g[0]!);
      frond(c, 24, 26, 22, -8, g[0]!);
      frond(c, 24, 26, -16, -18, g[1]!);
      frond(c, 24, 26, 16, -18, g[1]!);
      frond(c, 24, 26, -20, 2, g[2]!);
      frond(c, 24, 26, 20, 2, g[2]!);
      frond(c, 24, 26, 0, -22, g[1]!);
      ellipse(c, '#5a3d1e', 22, 29, 2, 2);
      ellipse(c, '#5a3d1e', 27, 30, 2, 2);
      outline(c, 48, 84);
    },
  ],
  'billboard-voltkat': [
    84,
    58,
    (c) => {
      rect(c, '#2a2c38', 14, 34, 4, 24);
      rect(c, '#2a2c38', 66, 34, 4, 24);
      rect(c, '#1b1230', 0, 0, 84, 36);
      rect(c, '#7b2cff', 2, 2, 80, 32);
      trap(c, '#c6ff2e', 4, 18, 14, 22, 8, 16);
      trap(c, '#c6ff2e', 16, 30, 12, 20, 9, 12);
      text(c, 'VOLTKAT', 52, 13, '#ffffff', 11);
      text(c, 'GRAPE LIGHTNING', 52, 26, '#c6ff2e', 6);
      outline(c, 84, 58);
      glow(c, '#b06cff', 42, 18, 40, 0.25);
    },
  ],
  'billboard-varga': [
    84,
    58,
    (c) => {
      rect(c, '#2a2c38', 14, 34, 4, 24);
      rect(c, '#2a2c38', 66, 34, 4, 24);
      rect(c, '#2b1020', 0, 0, 84, 36);
      rect(c, '#e05a9b', 2, 2, 80, 32);
      text(c, 'VARGA', 42, 11, '#ffffff', 12);
      text(c, 'PERFORMANCE PARTS', 42, 22, '#2b1020', 6);
      text(c, 'TODAY ONLY!', 42, 30, '#fff3c4', 6);
      outline(c, 84, 58);
    },
  ],
  'billboard-teo': [
    84,
    58,
    (c) => {
      rect(c, '#2a2c38', 14, 34, 4, 24);
      rect(c, '#2a2c38', 66, 34, 4, 24);
      rect(c, '#0f2030', 0, 0, 84, 36);
      rect(c, '#2f5d8a', 2, 2, 80, 32);
      text(c, "TEO'S GARAGE", 42, 12, '#ffffff', 9);
      text(c, 'WE LISTEN FIRST', 42, 25, '#9fd0ff', 6);
      outline(c, 84, 58);
    },
  ],
  warehouse: [
    128,
    64,
    (c) => {
      rect(c, '#6f7f92', 0, 14, 128, 50);
      trap(c, '#55657a', 0, 14, 60, 68, 0, 128);
      for (let x = 2; x < 128; x += 5) rect(c, '#64748a', x, 16, 1, 46);
      rect(c, '#2c3440', 12, 30, 34, 34);
      rect(c, '#2c3440', 82, 30, 34, 34);
      for (let y = 33; y < 64; y += 4) {
        rect(c, '#3a4452', 12, y, 34, 1);
        rect(c, '#3a4452', 82, y, 34, 1);
      }
      rect(c, '#e0b040', 0, 22, 128, 2);
      text(c, 'PIER 7', 64, 40, '#e8e4d8', 8);
      rect(c, WINDOW, 58, 46, 12, 6);
      outline(c, 128, 64);
    },
  ],
  containers: [
    80,
    44,
    (c) => {
      const cols = ['#c0392b', '#2a6fb0', '#e0a030', '#2e8b57', '#8e44ad'];
      const box = (x: number, y: number, k: number) => {
        rect(c, cols[k % 5]!, x, y, 38, 14);
        for (let i = 2; i < 38; i += 3) rect(c, shade(cols[k % 5]!, 0.8), x + i, y + 1, 1, 12);
        rect(c, shade(cols[k % 5]!, 1.25), x, y, 38, 1);
      };
      box(0, 30, 0);
      box(40, 30, 1);
      box(0, 15, 2);
      box(40, 15, 3);
      box(20, 0, 4);
      outline(c, 80, 44);
    },
  ],
  crane: [
    80,
    140,
    (c) => {
      const o = '#e0612f';
      rect(c, o, 14, 30, 5, 110);
      rect(c, o, 44, 30, 5, 110);
      for (let y = 36; y < 136; y += 16) {
        line(c, shade(o, 0.8), 16, y, 46, y + 14, 2);
        line(c, shade(o, 0.8), 46, y, 16, y + 14, 2);
      }
      rect(c, o, 0, 24, 80, 6);
      rect(c, shade(o, 0.75), 0, 29, 80, 2);
      trap(c, o, 6, 24, 30, 34, 22, 42);
      rect(c, '#dfe6ee', 26, 12, 12, 10);
      rect(c, '#22324a', 28, 14, 8, 5);
      rect(c, '#22222b', 66, 30, 1, 46);
      rect(c, '#55555f', 62, 76, 9, 6);
      rect(c, '#ff4030', 31, 4, 2, 2);
      outline(c, 80, 140);
      glow(c, '#ff4030', 32, 5, 6, 0.8);
    },
  ],
  bollard: [
    8,
    10,
    (c) => {
      rect(c, '#2a2a33', 1, 3, 6, 7);
      rect(c, '#f2c230', 1, 1, 6, 3);
      rect(c, '#44444f', 0, 8, 8, 2);
      outline(c, 8, 10);
    },
  ],
  railing: [
    32,
    10,
    (c) => {
      rect(c, '#d9d4c4', 0, 1, 32, 2);
      rect(c, '#b9b3a0', 0, 5, 32, 1);
      rect(c, '#d9d4c4', 0, 1, 2, 9);
      rect(c, '#d9d4c4', 15, 1, 2, 9);
      rect(c, '#d9d4c4', 30, 1, 2, 9);
      outline(c, 32, 10);
    },
  ],
  shops: [
    96,
    72,
    (c) => {
      const body = ['#c98b5a', '#d8c7a8', '#b06a58'];
      for (let k = 0; k < 3; k++) {
        const x = k * 32;
        const top = 6 + (k % 2) * 8;
        rect(c, body[k]!, x, top, 32, 72 - top);
        rect(c, shade(body[k]!, 0.75), x, top, 32, 2);
        windows(c, x + 4, top + 6, 3, 2, 9, 9, k * 11 + 3, 5, 6);
        rect(c, ['#2c6e8f', '#b0162c', '#2e8b57'][k]!, x, 44, 32, 5);
        for (let i = 0; i < 32; i += 6) rect(c, '#f2f2f2', x + i, 44, 3, 5);
        rect(c, '#ffe2a0', x + 3, 52, 14, 14);
        rect(c, '#4a2c1e', x + 20, 52, 9, 20);
        rect(c, shade(body[k]!, 0.6), x + 31, top, 1, 72 - top);
      }
      outline(c, 96, 72);
      glow(c, '#ffd27a', 12, 60, 14, 0.3);
      glow(c, '#ffd27a', 44, 60, 14, 0.3);
      glow(c, '#ffd27a', 76, 60, 14, 0.3);
    },
  ],
  apartments: [
    72,
    112,
    (c) => {
      rect(c, '#7c6a8c', 0, 8, 72, 104);
      rect(c, '#63537a', 0, 8, 72, 3);
      rect(c, '#63537a', 60, 0, 8, 8);
      rect(c, '#55466a', 10, 2, 14, 6);
      windows(c, 6, 16, 6, 9, 11, 10, 77, 6, 6);
      for (let r = 0; r < 9; r++) rect(c, '#55466a', 4, 23 + r * 10, 64, 1);
      rect(c, '#3a2f4a', 30, 98, 12, 14);
      outline(c, 72, 112);
    },
  ],
  rock: [
    36,
    24,
    (c) => {
      trap(c, '#6f665c', 4, 24, 12, 18, 0, 30);
      trap(c, '#857b6e', 8, 24, 22, 28, 14, 36);
      trap(c, '#9a8f80', 6, 14, 13, 17, 8, 14);
      outline(c, 36, 24);
    },
  ],
  pine: [
    36,
    84,
    (c) => {
      rect(c, '#4a3424', 16, 66, 4, 18);
      const layers: [number, number, number][] = [
        [2, 30, 12],
        [18, 50, 15],
        [36, 70, 18],
      ];
      for (const [y0, y1, half] of layers) {
        trap(c, '#1c5636', y0, y1, 18, 18, 18 - half, 18 + half);
        trap(c, '#27704a', y0, y1, 18, 18, 18 - half, 18 - half / 3, 0.9);
      }
      outline(c, 36, 84);
    },
  ],
  bush: [
    22,
    12,
    (c) => {
      ellipse(c, '#2a7040', 7, 7, 7, 5);
      ellipse(c, '#338a4e', 14, 6, 7, 6);
      ellipse(c, '#44a35f', 12, 4, 3, 2);
      outline(c, 22, 12);
    },
  ],
  truss: [
    22,
    96,
    (c) => {
      rect(c, '#4c5666', 2, 0, 4, 96);
      rect(c, '#4c5666', 16, 0, 4, 96);
      for (let y = 0; y < 96; y += 16) {
        line(c, '#6a7688', 4, y, 18, y + 16, 2);
        line(c, '#6a7688', 18, y, 4, y + 16, 2);
        rect(c, '#7f8b9d', 0, y, 22, 3);
      }
      rect(c, '#d9d4c4', 0, 84, 22, 2);
      outline(c, 22, 96);
    },
  ],
  lighthouse: [
    44,
    160,
    (c) => {
      for (let i = 0; i < 6; i++)
        trap(
          c,
          i % 2 ? '#d7263d' : '#f2efe6',
          40 + i * 20,
          60 + i * 20,
          14 - i,
          30 + i,
          13 - i,
          31 + i,
        );
      for (let i = 0; i < 6; i++) rect(c, '#00000022', 26 + i, 40 + i * 20, 5, 20);
      rect(c, '#2a2a33', 10, 34, 24, 6);
      rect(c, '#22324a', 13, 20, 18, 14);
      rect(c, '#fff3c4', 15, 22, 14, 10);
      trap(c, '#d7263d', 8, 20, 21, 23, 11, 33);
      rect(c, '#2a2a33', 21, 2, 2, 6);
      rect(c, '#22324a', 19, 110, 6, 10);
      outline(c, 44, 160);
      glow(c, '#fff0b0', 22, 27, 22, 0.8);
    },
  ],
  sailboat: [
    44,
    48,
    (c) => {
      rect(c, '#3a2a1e', 21, 2, 2, 34);
      trap(c, '#f6f1e4', 4, 34, 23, 24, 23, 40);
      trap(c, '#e6ddc8', 8, 34, 20, 21, 6, 21);
      trap(c, '#b0162c', 36, 42, 2, 42, 8, 38);
      rect(c, '#f2efe6', 2, 36, 40, 1);
      outline(c, 44, 48);
      rect(c, '#9fc4e8', 0, 43, 44, 1, 0.6);
      rect(c, '#9fc4e8', 6, 46, 30, 1, 0.4);
    },
  ],
  gantry: [
    176,
    66,
    (c) => {
      rect(c, '#3a3d4a', 2, 10, 8, 56);
      rect(c, '#3a3d4a', 166, 10, 8, 56);
      rect(c, '#55596a', 4, 10, 2, 56);
      rect(c, '#55596a', 168, 10, 2, 56);
      rect(c, '#1b1b24', 0, 0, 176, 24);
      for (let x = 0; x < 176; x += 8)
        for (let y = 0; y < 2; y++)
          rect(c, (x / 8 + y) % 2 ? '#f2f2f2' : '#1b1b24', x, y * 4, 8, 4);
      text(c, 'HARBOUR LOOP', 88, 16, '#ffcc33', 11);
      for (let i = 0; i < 5; i++) {
        rect(c, '#101018', 60 + i * 12, 25, 8, 6);
        rect(c, '#39d353', 62 + i * 12, 26, 4, 4);
      }
      outline(c, 176, 66);
    },
  ],
  grandstand: [
    128,
    58,
    (c) => {
      trap(c, '#3d4250', 0, 12, 0, 128, 0, 128);
      rect(c, '#e8e4d8', 0, 0, 128, 3);
      for (let r = 0; r < 6; r++) {
        rect(c, r % 2 ? '#596072' : '#4b5162', 4, 14 + r * 6, 120, 6);
        for (let x = 6; x < 122; x += 4) {
          const h = hash(x * 13 + r * 101);
          if (h > 0.25)
            rect(
              c,
              ['#ffcc33', '#e05a9b', '#5aa9e6', '#f2f2f2', '#39d353', '#ff7a2f'][
                Math.floor(h * 6)
              ]!,
              x,
              15 + r * 6,
              2,
              3,
            );
        }
      }
      rect(c, '#2a2c38', 0, 50, 128, 8);
      rect(c, '#2a2c38', 2, 3, 2, 12);
      rect(c, '#2a2c38', 124, 3, 2, 12);
      rect(c, '#2a2c38', 62, 3, 2, 12);
      outline(c, 128, 58);
    },
  ],
  barrier: [
    32,
    10,
    (c) => {
      for (let i = 0; i < 4; i++) rect(c, i % 2 ? '#f2f2f2' : '#d7263d', i * 8, 1, 8, 7);
      rect(c, '#00000033', 0, 6, 32, 2);
      rect(c, '#55555f', 0, 8, 32, 2);
      outline(c, 32, 10);
    },
  ],
  'chevron-l': [20, 30, (c) => chevron(c, -1)],
  'chevron-r': [20, 30, (c) => chevron(c, 1)],
};

function chevron(c: Ctx, dir: number): void {
  rect(c, '#55555f', 9, 18, 2, 12);
  rect(c, '#101018', 0, 0, 20, 19);
  rect(c, '#ffcc33', 1, 1, 18, 17);
  for (let k = 0; k < 2; k++)
    for (let i = 0; i < 7; i++) {
      const off = i < 4 ? i : 6 - i;
      const x = dir > 0 ? 3 + k * 7 + off : 14 - k * 7 - off;
      rect(c, '#101018', x, 3 + i * 2, 3, 2);
    }
  outline(c, 20, 30);
}

export const SKY_STOPS: [number, string][] = [
  [0, '#191a47'],
  [0.3, '#4a2a78'],
  [0.58, '#b0457e'],
  [0.8, '#f0825a'],
  [1, '#ffd58a'],
];
/** Colour distant ground fades to. */
export const HAZE = '#e8987a';

export const BACKDROPS: Record<string, Art> = {
  'bg-sky': [384, 100, (c) => bands(c, 0, 0, 384, 100, SKY_STOPS, 30)],
  'bg-sun': [
    96,
    96,
    (c) => {
      glow(c, '#ffe9a0', 48, 48, 48, 0.55);
      ellipse(c, '#fff2c0', 48, 48, 18, 18);
      ellipse(c, '#fffbe6', 48, 46, 13, 13);
    },
  ],
  'bg-clouds': [
    512,
    46,
    (c) => {
      for (let k = 0; k < 9; k++) {
        const x = Math.floor(hash(k * 3 + 1) * 480);
        const y = 6 + Math.floor(hash(k * 5 + 2) * 26);
        const w = 40 + Math.floor(hash(k * 7 + 3) * 60);
        rect(c, '#e88aa0', x, y + 3, w, 3, 0.85);
        rect(c, '#f6b6a6', x + 6, y + 1, w - 14, 2, 0.9);
        rect(c, '#ffd9b8', x + 12, y, w - 30, 1, 0.9);
        rect(c, '#8a4f8e', x + 4, y + 6, w - 10, 2, 0.6);
      }
    },
  ],
  'bg-mountains': [
    512,
    44,
    (c) => {
      for (let x = 0; x < 512; x++) {
        const h =
          14 +
          10 * Math.sin((x / 512) * Math.PI * 4) +
          7 * Math.sin((x / 512) * Math.PI * 14 + 1) +
          3 * Math.sin((x / 512) * Math.PI * 38);
        rect(c, '#5a3a7e', x, 44 - h, 1, h);
        rect(c, '#7a4a8a', x, 44 - h, 1, 2);
      }
      rect(c, HAZE, 0, 38, 512, 6, 0.35);
    },
  ],
  'bg-city': [
    512,
    46,
    (c) => {
      let x = 0;
      let k = 0;
      while (x < 512) {
        const w = 10 + Math.floor(hash(k * 9 + 4) * 18);
        const h = 10 + Math.floor(hash(k * 5 + 9) * 30);
        const col = mix('#2a2152', '#3c2c66', hash(k));
        rect(c, col, x, 46 - h, w, h);
        for (let wy = 46 - h + 3; wy < 44; wy += 4)
          for (let wx = x + 2; wx < x + w - 2; wx += 3)
            if (hash(wx * 17 + wy * 29) > 0.6) rect(c, WINDOW, wx, wy, 1, 2);
        if (hash(k * 2 + 77) > 0.8) {
          rect(c, col, x + w / 2, 46 - h - 6, 1, 6);
          rect(c, '#ff4030', x + w / 2, 46 - h - 7, 1, 1);
        }
        x += w + (hash(k + 50) > 0.7 ? 6 : 1);
        k++;
      }
      rect(c, HAZE, 0, 40, 512, 6, 0.3);
    },
  ],
  'fx-smoke': [
    16,
    16,
    (c) => {
      glow(c, '#f2f2f2', 8, 8, 8, 0.9);
    },
  ],
};

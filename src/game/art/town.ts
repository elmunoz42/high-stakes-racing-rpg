import { outline } from './cars.ts';
import { type Ctx, bands, ellipse, glow, hash, line, rect, shade, text, trap } from './pixel.ts';
import { SKY_STOPS } from './race.ts';

/** Town street art: backdrop layers, buildings, props and interiors. [w, h, draw]. */
type Art = [number, number, (c: Ctx) => void];

const WARM = '#ffd27a';

function bricks(c: Ctx, x: number, y: number, w: number, h: number, base: string): void {
  rect(c, base, x, y, w, h);
  for (let r = 0; r < h; r += 5) {
    rect(c, shade(base, 0.8), x, y + r + 4, w, 1);
    for (let k = (r / 5) % 2 ? 4 : 0; k < w; k += 10) rect(c, shade(base, 0.8), x + k, y + r, 1, 4);
    for (let k = 0; k < w; k += 10)
      if (hash(k * 7 + r * 13) > 0.8) rect(c, shade(base, 1.15), x + k + 2, y + r + 1, 6, 2);
  }
}

function wallLamp(c: Ctx, x: number, y: number): void {
  rect(c, '#2a2c38', x - 2, y, 5, 2);
  rect(c, '#fff3c4', x - 1, y + 2, 3, 2);
}

export const TOWN: Record<string, Art> = {
  'town-sky': [384, 216, (c) => bands(c, 0, 0, 384, 150, SKY_STOPS, 40)],
  'town-headland': [
    384,
    40,
    (c) => {
      for (let x = 0; x < 384; x++) {
        const h =
          8 + 10 * Math.sin((x / 384) * Math.PI) * Math.abs(Math.sin(x / 60)) + 3 * Math.sin(x / 9);
        rect(c, '#5a3a7e', x, 40 - h, 1, h);
      }
      rect(c, '#f2efe6', 318, 8, 4, 18);
      rect(c, '#d7263d', 318, 12, 4, 3);
      rect(c, '#d7263d', 318, 19, 4, 3);
      rect(c, '#2a2a33', 317, 5, 6, 3);
    },
  ],
  'town-sea': [
    128,
    64,
    (c) => {
      bands(
        c,
        0,
        0,
        128,
        64,
        [
          [0, '#f0a070'],
          [0.12, '#b0608c'],
          [0.4, '#3f5fa2'],
          [1, '#274a86'],
        ],
        16,
      );
      for (let k = 0; k < 60; k++) {
        const y = 2 + Math.floor(hash(k * 3) * 60);
        const x = Math.floor(hash(k * 5 + 1) * 120);
        rect(c, y < 14 ? '#ffe0a8' : '#6f93cc', x, y, 3 + Math.floor(hash(k) * 8), 1, 0.7);
      }
    },
  ],
  'town-glint': [
    48,
    64,
    (c) => {
      for (let y = 0; y < 64; y += 2) {
        const w = 6 + Math.floor(hash(y * 11) * 22);
        rect(c, '#fff0c0', 24 - w / 2, y, w, 1, 0.75 - y / 110);
      }
    },
  ],
  'town-rail': [
    32,
    16,
    (c) => {
      rect(c, '#cfc6ae', 0, 10, 32, 6);
      rect(c, '#e2dac4', 0, 10, 32, 1);
      rect(c, '#3a3d4a', 0, 2, 32, 1);
      rect(c, '#3a3d4a', 0, 6, 32, 1);
      rect(c, '#3a3d4a', 0, 1, 2, 10);
      rect(c, '#3a3d4a', 16, 1, 2, 10);
    },
  ],
  'town-ground': [
    64,
    48,
    (c) => {
      rect(c, '#a79c8c', 0, 0, 64, 9);
      for (let x = 0; x < 64; x += 16) rect(c, '#91877a', x, 0, 1, 9);
      rect(c, '#bdb2a0', 0, 0, 64, 1);
      rect(c, '#6a6257', 0, 9, 64, 3);
      rect(c, '#3a3b45', 0, 12, 64, 36);
      for (let k = 0; k < 40; k++)
        rect(
          c,
          hash(k) > 0.5 ? '#42434e' : '#33343d',
          Math.floor(hash(k * 3 + 1) * 62),
          13 + Math.floor(hash(k * 7 + 2) * 34),
          2,
          1,
        );
      rect(c, '#d9b24a', 6, 29, 22, 2);
      rect(c, '#d9b24a', 38, 29, 22, 2);
    },
  ],
  'town-lamp': [
    24,
    80,
    (c) => {
      rect(c, '#23252f', 11, 12, 2, 68);
      rect(c, '#30323e', 9, 74, 6, 6);
      rect(c, '#23252f', 6, 9, 12, 3);
      rect(c, '#fff3c4', 8, 12, 8, 2);
      outline(c, 24, 80);
      glow(c, '#ffe08a', 12, 14, 12, 0.7);
    },
  ],
  'town-lightpool': [
    80,
    16,
    (c) => {
      const g = c.createRadialGradient(40, 8, 0, 40, 8, 40);
      g.addColorStop(0, 'rgba(255,224,138,0.32)');
      g.addColorStop(1, 'rgba(255,224,138,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 80, 16);
    },
  ],
  'town-bench': [
    30,
    14,
    (c) => {
      rect(c, '#7a5a3a', 0, 4, 30, 3);
      rect(c, '#8f6c48', 0, 0, 30, 3);
      rect(c, '#2a2c38', 3, 7, 2, 7);
      rect(c, '#2a2c38', 25, 7, 2, 7);
      outline(c, 30, 14);
    },
  ],
  'town-crate': [
    18,
    14,
    (c) => {
      rect(c, '#9a6b3c', 0, 0, 18, 14);
      rect(c, '#6e4a28', 0, 0, 18, 2);
      rect(c, '#6e4a28', 0, 6, 18, 1);
      rect(c, '#6e4a28', 8, 0, 2, 14);
      outline(c, 18, 14);
    },
  ],
  'town-tyres': [
    16,
    20,
    (c) => {
      for (let i = 0; i < 4; i++) {
        rect(c, '#15151b', 1, i * 5, 14, 5);
        rect(c, '#2e2e38', 3, i * 5 + 2, 10, 1);
      }
      outline(c, 16, 20);
    },
  ],
  'town-arrow': [
    11,
    9,
    (c) => {
      trap(c, '#ffcc33', 0, 4, 3, 8, 3, 8);
      trap(c, '#ffcc33', 4, 9, 0, 11, 5, 6);
      outline(c, 11, 9, '#1b1300');
    },
  ],
  'gull-0': [
    11,
    6,
    (c) => {
      line(c, '#f4f4f4', 0, 0, 5, 3);
      line(c, '#f4f4f4', 5, 3, 10, 0);
    },
  ],
  'gull-1': [
    11,
    6,
    (c) => {
      line(c, '#f4f4f4', 0, 4, 5, 2);
      line(c, '#f4f4f4', 5, 2, 10, 4);
    },
  ],

  // ---------- Buildings (door at the horizontal centre) ----------
  'bld-garage': [
    200,
    124,
    (c) => {
      bricks(c, 0, 20, 200, 104, '#8e4b3a');
      rect(c, '#232a36', 0, 0, 200, 24);
      rect(c, '#5aa9e6', 0, 22, 200, 3);
      rect(c, '#2f5d8a', 34, 3, 132, 16);
      rect(c, '#9fd0ff', 34, 3, 132, 1);
      text(c, "TEO'S GARAGE", 100, 11, '#ffffff', 11);
      // Roll door, half open.
      rect(c, '#14161d', 58, 44, 84, 80);
      for (let y = 44; y < 82; y += 4) {
        rect(c, '#b4b9c2', 58, y, 84, 3);
        rect(c, '#8d939d', 58, y + 3, 84, 1);
      }
      rect(c, '#6b717b', 58, 82, 84, 2);
      rect(c, '#2b3340', 70, 104, 60, 3);
      rect(c, '#2b3340', 74, 88, 3, 18);
      rect(c, '#2b3340', 123, 88, 3, 18); // lift
      glow(c, WARM, 100, 100, 44, 0.22);
      rect(c, '#55596a', 56, 42, 88, 3);
      // Window with tools, side door, drums.
      rect(c, '#2a1f18', 12, 52, 34, 26);
      rect(c, '#ffe2a0', 14, 54, 30, 22);
      line(c, '#6b4a2a', 18, 58, 24, 70);
      rect(c, '#6b4a2a', 30, 58, 2, 12);
      rect(c, '#6b4a2a', 36, 60, 5, 2);
      rect(c, '#2c3440', 158, 70, 26, 54);
      rect(c, '#3b4656', 160, 72, 22, 24);
      rect(c, '#ffcc33', 179, 98, 2, 3);
      for (const x of [8, 22]) {
        rect(c, '#2e8b57', x, 98, 12, 26);
        rect(c, '#1f6a40', x, 104, 12, 2);
        rect(c, '#1f6a40', x, 114, 12, 2);
      }
      wallLamp(c, 52, 34);
      wallLamp(c, 148, 34);
      outline(c, 200, 124);
      glow(c, WARM, 52, 38, 16, 0.5);
      glow(c, WARM, 148, 38, 16, 0.5);
      glow(c, WARM, 29, 65, 22, 0.3);
    },
  ],
  'bld-shop': [
    180,
    114,
    (c) => {
      rect(c, '#d9ccb2', 0, 0, 180, 114);
      for (let y = 30; y < 114; y += 7) rect(c, '#cbbd9f', 0, y, 180, 1);
      rect(c, '#b3246f', 0, 0, 180, 22);
      rect(c, '#e05a9b', 2, 2, 176, 18);
      text(c, 'VARGA PERFORMANCE PARTS', 90, 11, '#ffffff', 10);
      // Awning.
      for (let x = 0; x < 180; x += 12) {
        rect(c, x % 24 ? '#f4f4f4' : '#e05a9b', x, 22, 12, 12);
        ellipse(c, x % 24 ? '#f4f4f4' : '#e05a9b', x + 6, 34, 6, 3);
      }
      rect(c, '#00000033', 0, 37, 180, 3);
      // Windows with wheels on display.
      for (const x of [10, 112]) {
        rect(c, '#3a2a20', x, 46, 58, 44);
        rect(c, '#ffe7b0', x + 2, 48, 54, 40);
        for (const wx of [x + 16, x + 42]) {
          ellipse(c, '#1a1a22', wx, 72, 11, 11);
          ellipse(c, '#c9ccd6', wx, 72, 7, 7);
          ellipse(c, '#1a1a22', wx, 72, 2, 2);
        }
        rect(c, '#d7263d', x + 6, 52, 16, 6);
        rect(c, '#2a6fb0', x + 34, 52, 16, 6);
      }
      // Door with OPEN sign.
      rect(c, '#4a2c1e', 76, 48, 28, 66);
      rect(c, '#9fc4e8', 79, 52, 22, 34);
      rect(c, '#ffcc33', 99, 88, 2, 4);
      rect(c, '#101018', 82, 56, 16, 8);
      text(c, 'OPEN', 90, 60, '#ff5e7a', 6);
      rect(c, '#8f8676', 0, 108, 180, 6);
      outline(c, 180, 114);
      glow(c, WARM, 39, 68, 34, 0.3);
      glow(c, WARM, 141, 68, 34, 0.3);
      glow(c, '#ff5e7a', 90, 60, 12, 0.5);
    },
  ],
  'bld-lounge': [
    180,
    114,
    (c) => {
      rect(c, '#241c3a', 0, 0, 180, 114);
      for (let x = 0; x < 180; x += 18) rect(c, '#2e2448', x, 0, 1, 114);
      rect(c, '#c6ff2e', 14, 6, 152, 1);
      rect(c, '#c6ff2e', 14, 30, 152, 1);
      text(c, 'THE BRASS GULL', 96, 18, '#c6ff2e', 13);
      line(c, '#ffcc33', 20, 20, 26, 14, 2);
      line(c, '#ffcc33', 26, 14, 32, 20, 2); // gull
      rect(c, '#7b2cff', 0, 38, 180, 8);
      for (let x = 0; x < 180; x += 12) trap(c, '#9b5de5', 46, 52, x, x + 12, x + 5, x + 7);
      for (const x of [12, 118]) {
        rect(c, '#120e20', x, 58, 50, 36);
        rect(c, '#6a3fb8', x + 2, 60, 46, 32);
        rect(c, '#c6ff2e', x + 6, 64, 10, 14);
        rect(c, '#ffd27a', x + 22, 70, 18, 3);
        rect(c, '#2a1f40', x + 20, 80, 26, 12);
      }
      rect(c, '#0e0b18', 76, 56, 28, 58);
      rect(c, '#2a2140', 79, 59, 22, 30);
      rect(c, '#ffcc33', 98, 88, 2, 6);
      rect(c, '#7b2cff', 150, 62, 22, 30);
      text(c, 'VOLT', 161, 70, '#c6ff2e', 6);
      text(c, 'KAT', 161, 80, '#ffffff', 6);
      outline(c, 180, 114);
      glow(c, '#c6ff2e', 96, 18, 70, 0.22);
      glow(c, '#9b5de5', 37, 76, 34, 0.35);
      glow(c, '#9b5de5', 143, 76, 34, 0.35);
    },
  ],
  'bld-trailer': [
    210,
    96,
    (c) => {
      rect(c, '#f2a541', 0, 0, 210, 8);
      for (let x = 0; x < 210; x += 14) rect(c, '#f4f4f4', x, 0, 7, 8); // awning
      rect(c, '#2a2c38', 4, 8, 2, 78);
      rect(c, '#2a2c38', 204, 8, 2, 78);
      rect(c, '#ecebe4', 10, 14, 190, 66);
      rect(c, '#ffffff', 10, 14, 190, 2);
      rect(c, '#c9c6ba', 10, 74, 190, 6);
      rect(c, '#f2a541', 10, 44, 190, 8);
      rect(c, '#d7263d', 10, 52, 190, 2);
      text(c, 'TEAM HQ', 52, 33, '#2b2b33', 11);
      text(c, 'OKAFOR COACHING', 156, 33, '#2b2b33', 7);
      rect(c, '#3b4c63', 24, 56, 34, 14);
      rect(c, '#ffe7b0', 26, 58, 30, 10);
      rect(c, '#3b4c63', 150, 56, 34, 14);
      rect(c, '#9fe0a0', 152, 58, 30, 10);
      rect(c, '#9a968a', 92, 22, 26, 58);
      rect(c, '#55524a', 94, 24, 22, 30);
      rect(c, '#ffcc33', 114, 56, 2, 4); // door
      rect(c, '#6e6c68', 86, 80, 38, 4);
      rect(c, '#6e6c68', 90, 84, 30, 4);
      rect(c, '#6e6c68', 94, 88, 22, 4); // steps
      for (const x of [38, 172]) {
        ellipse(c, '#15151b', x, 86, 9, 9);
        ellipse(c, '#8d939d', x, 86, 4, 4);
      }
      rect(c, '#d7263d', 126, 70, 18, 14);
      rect(c, '#a01a2c', 126, 74, 18, 1);
      rect(c, '#a01a2c', 126, 79, 18, 1); // tool chest
      outline(c, 210, 96);
      glow(c, WARM, 41, 63, 22, 0.35);
      glow(c, '#9fe0a0', 167, 63, 22, 0.3);
    },
  ],
  'bld-gate': [
    150,
    124,
    (c) => {
      rect(c, '#3a3d4a', 4, 14, 10, 110);
      rect(c, '#3a3d4a', 136, 14, 10, 110);
      rect(c, '#55596a', 6, 14, 3, 110);
      rect(c, '#55596a', 138, 14, 3, 110);
      rect(c, '#1b1b24', 0, 0, 150, 30);
      for (let x = 0; x < 150; x += 10)
        for (let y = 0; y < 2; y++)
          rect(c, (x / 10 + y) % 2 ? '#f2f2f2' : '#1b1b24', x, y * 5, 10, 5);
      text(c, 'HARBOUR LOOP', 75, 20, '#ffcc33', 11);
      for (let i = 0; i < 5; i++) {
        rect(c, '#101018', 44 + i * 13, 32, 9, 7);
        rect(c, '#d7263d', 46 + i * 13, 33, 5, 5);
      }
      rect(c, '#d7263d', 14, 96, 122, 5);
      for (let x = 14; x < 136; x += 16) rect(c, '#f2f2f2', x, 96, 8, 5);
      line(c, '#2a2c38', 2, 14, 2, 0);
      trap(c, '#e05a9b', 0, 8, 3, 16, 3, 3);
      line(c, '#2a2c38', 147, 14, 147, 0);
      trap(c, '#5aa9e6', 0, 8, 134, 147, 147, 147);
      outline(c, 150, 124);
      for (let i = 0; i < 5; i++) glow(c, '#ff4030', 48 + i * 13, 35, 6, 0.6);
    },
  ],
};

// ---------- Interiors: full-screen backdrops, floor at y = 180 ----------
function room(c: Ctx, wall: string, floor: string, accent: string): void {
  bands(
    c,
    0,
    0,
    384,
    180,
    [
      [0, shade(wall, 0.7)],
      [1, wall],
    ],
    14,
  );
  rect(c, shade(wall, 0.6), 0, 172, 384, 8);
  rect(c, accent, 0, 40, 384, 2);
  rect(c, floor, 0, 180, 384, 36);
  for (let x = 0; x < 384; x += 24) rect(c, shade(floor, 0.8), x, 180, 1, 36);
  rect(c, shade(floor, 1.3), 0, 180, 384, 1);
  // Way out.
  rect(c, '#0e0f16', 10, 112, 34, 68);
  rect(c, shade(wall, 1.3), 8, 110, 38, 2);
  rect(c, '#39d353', 16, 100, 22, 8);
  text(c, 'EXIT', 27, 104, '#0e0f16', 6);
  glow(c, '#39d353', 27, 104, 16, 0.35);
}

function ceilingLight(c: Ctx, x: number): void {
  rect(c, '#2a2c38', x - 1, 0, 2, 14);
  rect(c, '#dfe6ee', x - 14, 14, 28, 3);
  trap(c, '#fff3c4', 17, 180, x - 14, x + 14, x - 60, x + 60, 0.06);
}

export const INTERIORS: Record<string, Art> = {
  'room-garage': [
    384,
    216,
    (c) => {
      room(c, '#4a5568', '#2d3340', '#5aa9e6');
      for (let x = 60; x < 384; x += 6)
        for (let y = 52; y < 100; y += 6) rect(c, '#3c4656', x, y, 1, 1);
      rect(c, '#6b4a2a', 56, 48, 110, 3);
      line(c, '#c9ccd6', 70, 56, 70, 80, 2);
      rect(c, '#c9ccd6', 67, 54, 8, 4); // spanner
      line(c, '#c9ccd6', 86, 56, 96, 84, 2);
      rect(c, '#d7263d', 106, 56, 4, 24);
      rect(c, '#c9ccd6', 104, 80, 8, 3);
      rect(c, '#c9ccd6', 122, 58, 16, 3);
      rect(c, '#6b4a2a', 128, 61, 4, 20); // hammer
      ellipse(c, '#15151b', 150, 70, 9, 9);
      ellipse(c, '#4a5568', 150, 70, 5, 5); // tyre on wall
      rect(c, '#f4f4f4', 300, 52, 30, 36);
      rect(c, '#d7263d', 300, 52, 30, 8);
      text(c, '13', 315, 74, '#2b2b33', 12); // calendar
      // Lift.
      rect(c, '#e0b040', 112, 96, 8, 84);
      rect(c, '#e0b040', 222, 96, 8, 84);
      rect(c, '#b9902c', 112, 96, 8, 3);
      rect(c, '#b9902c', 222, 96, 8, 3);
      rect(c, '#8d939d', 104, 138, 134, 4);
      rect(c, '#55596a', 104, 142, 134, 2);
      // Bench, tool chest, tyres.
      rect(c, '#6e5a44', 296, 150, 84, 5);
      rect(c, '#4a3c2e', 300, 155, 5, 25);
      rect(c, '#4a3c2e', 371, 155, 5, 25);
      rect(c, '#d7263d', 330, 124, 34, 26);
      for (let y = 128; y < 148; y += 6) rect(c, '#a01a2c', 330, y, 34, 1);
      rect(c, '#5aa9e6', 304, 140, 10, 10);
      rect(c, '#3b4656', 316, 144, 8, 6);
      for (let i = 0; i < 4; i++) {
        rect(c, '#15151b', 60, 160 - i * 9 + 11, 26, 9);
        rect(c, '#2e2e38', 64, 160 - i * 9 + 15, 18, 1);
      }
      ceilingLight(c, 170);
      ceilingLight(c, 310);
    },
  ],
  'room-shop': [
    384,
    216,
    (c) => {
      room(c, '#5b3a4f', '#2b2030', '#e05a9b');
      for (let x = 0; x < 384; x += 24)
        for (let y = 180; y < 216; y += 12)
          if ((x / 24 + y / 12) % 2) rect(c, '#372a3e', x, y, 24, 12);
      // Shelves of boxed parts.
      const cols = ['#d7263d', '#2a6fb0', '#e0a030', '#2e8b57', '#f4f4f4', '#8e44ad'];
      for (let r = 0; r < 3; r++) {
        rect(c, '#3b2a1e', 58, 78 + r * 30, 150, 4);
        for (let k = 0; k < 9; k++) {
          const h = 14 + Math.floor(hash(r * 10 + k) * 10);
          const col = cols[Math.floor(hash(r * 31 + k * 7) * 6)]!;
          rect(c, col, 62 + k * 16, 78 + r * 30 - h, 13, h);
          rect(c, shade(col, 0.75), 62 + k * 16, 78 + r * 30 - h, 13, 2);
          rect(c, '#ffffff', 64 + k * 16, 78 + r * 30 - h + 5, 8, 2, 0.7);
        }
      }
      // Wheels on the wall.
      for (const x of [236, 266]) {
        ellipse(c, '#15151b', x, 70, 13, 13);
        ellipse(c, '#c9ccd6', x, 70, 9, 9);
        for (let a = 0; a < 5; a++)
          line(c, '#8d939d', x, 70, x + Math.cos(a * 1.257) * 8, 70 + Math.sin(a * 1.257) * 8);
        ellipse(c, '#15151b', x, 70, 2, 2);
      }
      // Neon.
      rect(c, '#1a1020', 222, 96, 64, 16);
      text(c, 'TODAY ONLY', 254, 104, '#ff7ab8', 8);
      // Counter with register and Torque the duck.
      rect(c, '#7a4a2a', 292, 146, 92, 34);
      rect(c, '#935c36', 288, 142, 96, 5);
      rect(c, '#5f3820', 292, 160, 92, 2);
      rect(c, '#2a2c38', 338, 124, 26, 18);
      rect(c, '#9fe0a0', 341, 127, 20, 7);
      rect(c, '#55596a', 341, 136, 20, 4);
      ellipse(c, '#ffd23a', 312, 137, 6, 4);
      ellipse(c, '#ffd23a', 316, 131, 4, 4);
      rect(c, '#ff8a2a', 319, 131, 4, 2);
      rect(c, '#15151b', 316, 130, 1, 1);
      ceilingLight(c, 130);
      ceilingLight(c, 300);
      glow(c, '#ff7ab8', 254, 104, 44, 0.3);
    },
  ],
  'room-lounge': [
    384,
    216,
    (c) => {
      room(c, '#3d2f5c', '#1f1a2e', '#c6ff2e');
      // Big window on the dusk.
      rect(c, '#15101f', 60, 50, 132, 82);
      bands(c, 64, 54, 124, 50, SKY_STOPS, 12);
      bands(
        c,
        64,
        104,
        124,
        24,
        [
          [0, '#b0608c'],
          [1, '#274a86'],
        ],
        6,
      );
      ellipse(c, '#fff2c0', 150, 100, 10, 10);
      rect(c, '#15101f', 126, 50, 3, 82);
      rect(c, '#15101f', 60, 102, 132, 2);
      // Neon and fridge.
      text(c, 'VOLTKAT', 262, 66, '#c6ff2e', 16);
      trap(c, '#c6ff2e', 78, 92, 250, 262, 246, 254);
      trap(c, '#c6ff2e', 90, 102, 256, 266, 250, 254);
      rect(c, '#1a1626', 322, 96, 46, 84);
      rect(c, '#b8f0ff', 326, 100, 38, 70);
      for (let r = 0; r < 4; r++) {
        rect(c, '#55596a', 326, 116 + r * 16, 38, 1);
        for (let k = 0; k < 5; k++)
          rect(c, k % 2 ? '#7b2cff' : '#c6ff2e', 329 + k * 7, 105 + r * 16, 5, 10);
      }
      // Bar and stools.
      rect(c, '#4a2c1e', 206, 146, 110, 34);
      rect(c, '#6b4028', 202, 142, 118, 5);
      rect(c, '#c6ff2e', 206, 152, 110, 1);
      for (const x of [222, 250]) {
        rect(c, '#2a2c38', x + 4, 160, 2, 20);
        rect(c, '#9b5de5', x, 156, 10, 4);
      }
      // Sofa and plant.
      rect(c, '#7b2cff', 66, 152, 70, 20);
      rect(c, '#9b5de5', 66, 146, 70, 8);
      rect(c, '#5a1fc0', 62, 150, 6, 26);
      rect(c, '#5a1fc0', 134, 150, 6, 26);
      rect(c, '#8a5a3a', 156, 162, 14, 18);
      for (let a = -3; a <= 3; a++)
        line(c, '#2a9450', 163, 162, 163 + a * 6, 130 + Math.abs(a) * 5, 2);
      glow(c, '#c6ff2e', 262, 70, 60, 0.3);
      glow(c, '#b8f0ff', 345, 135, 50, 0.25);
      glow(c, '#ffd58a', 150, 100, 60, 0.2);
    },
  ],
  'room-trailer': [
    384,
    216,
    (c) => {
      room(c, '#d8d4c8', '#5f5a50', '#f2a541');
      rect(c, '#f2a541', 0, 44, 384, 4);
      // Timing screens.
      for (const [x, col] of [
        [62, '#39d353'],
        [114, '#5aa9e6'],
      ] as [number, string][]) {
        rect(c, '#15171f', x, 58, 46, 34);
        rect(c, '#0b0d14', x + 2, 60, 42, 30);
        for (let r = 0; r < 6; r++)
          rect(c, col, x + 5, 63 + r * 4, 10 + Math.floor(hash(x + r) * 26), 2);
        rect(c, '#2a2c38', x + 20, 92, 6, 6);
      }
      // Whiteboard with the track.
      rect(c, '#f8f8f4', 178, 54, 86, 56);
      rect(c, '#9a968a', 176, 52, 90, 2);
      rect(c, '#9a968a', 176, 110, 90, 3);
      const pts: [number, number][] = [
        [190, 96],
        [236, 98],
        [250, 88],
        [240, 76],
        [252, 64],
        [230, 60],
        [214, 72],
        [198, 64],
        [188, 78],
      ];
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length]!;
        line(c, '#2b2b33', p[0], p[1], q[0], q[1], 2);
      });
      rect(c, '#d7263d', 235, 96, 4, 4);
      text(c, 'COATHANGER', 222, 104, '#d7263d', 5);
      // Helmets, tyres, coffee.
      rect(c, '#9a968a', 280, 74, 80, 3);
      for (const [x, col] of [
        [290, '#ffcc33'],
        [312, '#d7263d'],
        [334, '#f4f4f4'],
      ] as [number, string][]) {
        ellipse(c, col, x, 66, 8, 8);
        rect(c, '#15171f', x - 2, 64, 9, 4);
      }
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 2; k++) {
          rect(c, '#15151b', 300 + k * 30, 152 - i * 10 + 18, 26, 10);
          rect(c, '#d7263d', 304 + k * 30, 152 - i * 10 + 22, 18, 2);
        }
      rect(c, '#5a4a3a', 60, 146, 60, 4);
      rect(c, '#2a2c38', 64, 150, 3, 30);
      rect(c, '#2a2c38', 113, 150, 3, 30);
      rect(c, '#2a2c38', 70, 128, 16, 18);
      rect(c, '#d7263d', 73, 131, 10, 4);
      rect(c, '#f4f4f4', 96, 138, 8, 8);
      ceilingLight(c, 150);
      ceilingLight(c, 300);
    },
  ],
};

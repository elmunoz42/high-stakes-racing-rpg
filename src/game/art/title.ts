import { type Ctx, bands, getRes, glow, hash, makeCanvas, rect, tone } from './pixel.ts';

/**
 * Title screen art: the "HIGH STAKES" logo, a night sky and a city skyline.
 * Original, generated in code like the rest of the game's art.
 */

export const TITLE_W = 384;
export const TITLE_H = 216;
/** Where the road meets the sky. */
export const TITLE_HORIZON = 132;

const NIGHT: [number, string][] = [
  [0, '#05061a'],
  [0.45, '#141a4a'],
  [0.8, '#3a1e5e'],
  [1, '#8a2f6a'],
];

export function drawTitleSky(c: Ctx): void {
  bands(c, 0, 0, TITLE_W, TITLE_HORIZON, NIGHT, 40);
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(hash(i * 3 + 1) * TITLE_W);
    const y = Math.floor(hash(i * 3 + 2) * TITLE_HORIZON * 0.7);
    const b = hash(i * 3 + 3);
    rect(c, b > 0.85 ? '#ffffff' : b > 0.5 ? '#b8c0ff' : '#6a70b8', x, y, 1, 1);
  }
  // A big low moon behind the city.
  glow(c, '#ffd0e8', 300, 92, 46, 0.35);
  for (let y = -20; y <= 20; y++) {
    const w = Math.sqrt(400 - y * y);
    rect(c, y < -6 ? '#ffe8f0' : y < 8 ? '#ffd2e2' : '#f6b2cc', 300 - w, 92 + y, w * 2, 1);
  }
  rect(c, '#f0a8c4', 290, 84, 6, 3);
  rect(c, '#f0a8c4', 306, 96, 4, 2);
}

/** Skyline: two rows of towers, the far one hazy, the near one lit. */
export function drawTitleCity(c: Ctx): void {
  const H = 72;
  const row = (seed: number, base: string, lit: number, maxH: number, haze: number) => {
    let x = -4;
    let k = 0;
    while (x < TITLE_W) {
      const w = 12 + Math.floor(hash(seed + k * 9) * 22);
      const h = 18 + Math.floor(hash(seed + k * 5 + 1) * maxH);
      const col = tone(base, 0.85 + hash(seed + k) * 0.3);
      rect(c, col, x, H - h, w, h);
      rect(c, tone(col, 1.25), x, H - h, 1, h); // lit edge
      rect(c, tone(col, 1.35), x, H - h, w, 1);
      for (let wy = H - h + 3; wy < H - 2; wy += 4)
        for (let wx = x + 2; wx < x + w - 2; wx += 3)
          if (hash(seed + wx * 17 + wy * 29) < lit)
            rect(c, hash(wx + wy * 7) > 0.85 ? '#7af0ff' : '#ffd27a', wx, wy, 1, 2);
      if (hash(seed + k * 2 + 77) > 0.7) {
        rect(c, col, x + Math.floor(w / 2), H - h - 7, 1, 7);
        rect(c, '#ff4030', x + Math.floor(w / 2), H - h - 8, 1, 1);
      }
      x += w + (hash(seed + k + 50) > 0.75 ? 4 : 0);
      k++;
    }
    rect(c, haze === 0 ? '#000000' : '#8a2f6a', 0, H - 10, TITLE_W, 10, haze);
  };
  row(100, '#2a2458', 0.25, 44, 0.35);
  row(300, '#16142e', 0.42, 30, 0.12);
  // Neon signs on the near towers.
  rect(c, '#ff3d8b', 40, 44, 22, 3);
  rect(c, '#ffd0e4', 41, 45, 20, 1);
  rect(c, '#3df0ff', 246, 38, 4, 16);
  rect(c, '#d8fcff', 247, 39, 2, 14);
}

/**
 * The logo: "HIGH STAKES" in heavy italic capitals, filled with bands of
 * chrome over gold, a dark outline and a drop shadow, and "RACING RPG" on a
 * red banner below. Text is drawn large and thresholded, so edges stay crisp.
 */
export function drawTitleLogo(c: Ctx, w: number, h: number): void {
  // Worked in device pixels (R per unit), painted back in units.
  const R = getRes();
  const word = makeCanvas(w, h);
  const wc = word.ctx;
  wc.font = '900 40px "Arial Black", "Helvetica Neue", Impact, sans-serif';
  wc.textAlign = 'center';
  wc.textBaseline = 'alphabetic';
  wc.setTransform(R, 0, -0.22 * R, R, 10 * R, 0); // italic lean, for speed
  wc.fillStyle = '#ffffff';
  wc.fillText('HIGH STAKES', w / 2, 46, w - 24);
  wc.setTransform(1, 0, 0, 1, 0, 0);

  const W = word.canvas.width;
  const H = word.canvas.height;
  const src = wc.getImageData(0, 0, W, H).data;
  const on = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && src[(y * W + x) * 4 + 3]! > 120;
  const dot = (col: string, x: number, y: number, a = 1) =>
    rect(c, col, x / R, y / R, 1 / R, 1 / R, a);
  let top = H;
  let bottom = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (on(x, y)) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  const span = Math.max(1, bottom - top);
  // Chrome on top, a dark horizon line, gold below: the classic arcade fill.
  const fill = (y: number) => {
    const v = (y - top) / span;
    if (v < 0.12) return '#ffffff';
    if (v < 0.3) return '#d8e4ff';
    if (v < 0.46) return '#8ea4d8';
    if (v < 0.52) return '#2a2a5a';
    if (v < 0.62) return '#ffe9a0';
    if (v < 0.78) return '#ffc23a';
    if (v < 0.9) return '#e08a1a';
    return '#a8540e';
  };

  // Shadow, then a thick outline, then the fill.
  const sh = 3 * R;
  const ol = 2 * R;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (on(x - sh, y - sh)) dot('#05030f', x, y, 0.75);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (on(x, y)) continue;
      let near = false;
      for (let dy = -ol; dy <= ol && !near; dy++)
        for (let dx = -ol; dx <= ol && !near; dx++)
          if (dx * dx + dy * dy <= ol * ol + 1 && on(x + dx, y + dy)) near = true;
      if (near) dot('#140a24', x, y);
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      dot(fill(y), x, y);
      // A lit rim on the top-left of each stroke.
      if (!on(x, y - 1) || !on(x - 1, y)) dot('#ffffff', x, y, 0.6);
    }

  // "RACING RPG" banner.
  const by = Math.round(bottom / R) + 7;
  const bw = 150;
  const bx = (w - bw) / 2;
  // Outline first, then the red, so no row covers the one above.
  for (let i = -1; i < 16; i++) {
    const skew = (15 - i) * 0.25;
    rect(c, '#140a24', bx - 2 + skew, by + i, bw + 4, 1);
  }
  for (let i = 0; i < 15; i++) {
    const skew = (15 - i) * 0.25;
    rect(
      c,
      i < 2 ? '#ff8a7a' : i < 5 ? '#f04048' : i < 10 ? '#d7263d' : '#9a1428',
      bx + skew,
      by + i,
      bw,
      1,
    );
  }
  rect(c, '#140a24', bx + 3, by + 14, bw + 2, 2);
  const tag = makeCanvas(w, 20);
  tag.ctx.font = 'bold 11px "Helvetica Neue", Arial, sans-serif';
  tag.ctx.textAlign = 'center';
  tag.ctx.textBaseline = 'middle';
  tag.ctx.fillStyle = '#ffffff';
  tag.ctx.fillText('R A C I N G   R P G', w / 2 + 2, 10);
  const TW = tag.canvas.width;
  const TH = tag.canvas.height;
  const td = tag.ctx.getImageData(0, 0, TW, TH).data;
  for (let y = 0; y < TH; y++)
    for (let x = 0; x < TW; x++)
      if (td[(y * TW + x) * 4 + 3]! > 110) rect(c, '#fff4e0', x / R, by - 3 + y / R, 1 / R, 1 / R);
}

/** Size of the logo texture. */
export const LOGO_W = 300;
export const LOGO_H = 80;

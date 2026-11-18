/**
 * Pixel-art drawing helpers on a plain 2D canvas. No Phaser here, so the
 * same code draws game textures and DOM portraits. All art in the game is
 * generated placeholder art, keyed so real art can replace it later.
 */

export type Ctx = CanvasRenderingContext2D;

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const to2 = (n: number) =>
  Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
export const hexOf = (r: number, g: number, b: number) => `#${to2(r)}${to2(g)}${to2(b)}`;

/** Multiply brightness: f < 1 darkens, f > 1 lightens. */
export function shade(hex: string, f: number): string {
  const [r, g, b] = rgb(hex);
  if (f <= 1) return hexOf(r * f, g * f, b * f);
  const t = f - 1;
  return hexOf(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return hexOf(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export const hexInt = (hex: string) => parseInt(hex.slice(1), 16);

export function rect(
  c: Ctx,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
): void {
  if (w <= 0 || h <= 0) return;
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  c.globalAlpha = 1;
}

/** Filled trapezoid drawn row by row so edges stay crisp. */
export function trap(
  c: Ctx,
  color: string,
  y0: number,
  y1: number,
  l0: number,
  r0: number,
  l1: number,
  r1: number,
  alpha = 1,
): void {
  const n = Math.max(1, Math.round(y1 - y0));
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const l = l0 + (l1 - l0) * t;
    const r = r0 + (r1 - r0) * t;
    rect(c, color, l, y0 + i, r - l, 1, alpha);
  }
}

/** Filled ellipse from 1px rows. */
export function ellipse(
  c: Ctx,
  color: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha = 1,
): void {
  for (let y = -ry; y <= ry; y++) {
    const w = rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry || 1)));
    rect(c, color, cx - w, cy + y, w * 2, 1, alpha);
  }
}

export function line(
  c: Ctx,
  color: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thick = 1,
): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    rect(
      c,
      color,
      x0 + (x1 - x0) * t - (thick - 1) / 2,
      y0 + (y1 - y0) * t - (thick - 1) / 2,
      thick,
      thick,
    );
  }
}

/** Vertical gradient in flat bands, for a retro banded sky. */
export function bands(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: [number, string][],
  count = 28,
): void {
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1]![0]) k++;
    const [t0, c0] = stops[k]!;
    const [t1, c1] = stops[k + 1]!;
    const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1)));
    const y0 = y + Math.floor((i * h) / count);
    const y1 = y + Math.floor(((i + 1) * h) / count);
    rect(c, mix(c0, c1, u), x, y0, w, y1 - y0);
  }
}

/** Soft round glow (for lamps, lights, the sun). */
export function glow(
  c: Ctx,
  color: string,
  cx: number,
  cy: number,
  r: number,
  strength = 0.5,
): void {
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
  const [R, G, B] = rgb(color);
  g.addColorStop(0, `rgba(${R},${G},${B},${strength})`);
  g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  c.fillStyle = g;
  c.fillRect(cx - r, cy - r, r * 2, r * 2);
}

export function text(
  c: Ctx,
  str: string,
  x: number,
  y: number,
  color: string,
  size = 8,
  align: CanvasTextAlign = 'center',
  bold = true,
): void {
  c.font = `${bold ? 'bold ' : ''}${size}px ui-monospace, Menlo, Consolas, monospace`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(str, Math.round(x), Math.round(y));
}

/** Deterministic pseudo-random in 0..1 from an integer, for texture detail. */
export function hash(n: number): number {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

// ---------------------------------------------------------------------------
// Shading toolkit. Flat colour reads as 8-bit; arcade hardware of the 90s had
// the colour budget for every surface to carry a ramp of tones, lit from the
// top left, with warm highlights and cool, slightly purple shadows.

const WARM: [number, number, number] = [255, 246, 220];
const COOL: [number, number, number] = [26, 16, 52];

/**
 * One colour lit (f > 1) or shaded (f < 1). Highlights drift warm, shadows
 * drift cool, rather than just going white or black.
 */
export function tone(hex: string, f: number): string {
  const [r, g, b] = rgb(hex);
  const [R, G, B] = toneRgb(r, g, b, f);
  return hexOf(R, G, B);
}

function toneRgb(r: number, g: number, b: number, f: number): [number, number, number] {
  if (f >= 1) {
    const t = Math.min(1, (f - 1) * 1.4);
    return [r + (WARM[0] - r) * t, g + (WARM[1] - g) * t, b + (WARM[2] - b) * t];
  }
  const t = Math.min(1, 1 - f);
  return [r + (COOL[0] - r) * t, g + (COOL[1] - g) * t, b + (COOL[2] - b) * t];
}

/** `n` tones of one colour from deep shadow (index 0) to highlight (n - 1). */
export function ramp(hex: string, n = 6): string[] {
  return Array.from({ length: n }, (_, i) => tone(hex, 0.45 + (0.75 * i) / (n - 1)));
}

/**
 * A panel lit from above: bands of tone from `top` (light) to `bottom` (dark).
 * Bands are whole rows, so the gradient stays crisp pixel art.
 */
export function panel(
  c: Ctx,
  hex: string,
  x: number,
  y: number,
  w: number,
  h: number,
  top = 1.15,
  bottom = 0.75,
): void {
  const rows = Math.max(1, Math.round(h));
  const steps = Math.max(2, Math.min(6, Math.round(rows / 3)));
  for (let i = 0; i < rows; i++) {
    const s = Math.floor((i / rows) * steps) / (steps - 1);
    rect(c, tone(hex, top + (bottom - top) * s), x, y + i, w, 1);
  }
}

export interface FinishOptions {
  /** Banded light-to-shadow shading down each flat area. */
  volume?: boolean;
  /** Lit top and left edges, shaded bottom and right edges. */
  rim?: boolean;
  /** Outline in a dark tone of the colour it borders, instead of black. */
  outline?: boolean;
  /** Shortest run of one colour that gets volume shading, px. */
  minRun?: number;
}

/**
 * Turns a flat-coloured sprite into a shaded one, in place: volume, rim light
 * and a coloured outline. For sprites only: skies and rooms keep their own
 * hand-placed gradients.
 */
export function finish(c: Ctx, w: number, h: number, opts: FinishOptions = {}): void {
  const { volume = false, rim = true, outline = true, minRun = 4 } = opts;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const at = (x: number, y: number) => (y * w + x) * 4;
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && src[at(x, y) + 3]! >= 250;
  const same = (a: number, b: number) =>
    src[a] === src[b] &&
    src[a + 1] === src[b + 1] &&
    src[a + 2] === src[b + 2] &&
    src[b + 3]! >= 250;
  const factor = new Float32Array(w * h).fill(1);

  if (volume)
    for (let x = 0; x < w; x++) {
      let y = 0;
      while (y < h) {
        if (!solid(x, y)) {
          y++;
          continue;
        }
        let end = y + 1;
        while (end < h && same(at(x, y), at(x, end))) end++;
        const len = end - y;
        if (len >= minRun) {
          const bands = len >= 14 ? 4 : 3;
          for (let i = 0; i < len; i++) {
            const step = Math.floor((i / len) * bands) / (bands - 1);
            factor[(y + i) * w + x]! *= 1.1 - 0.26 * step;
          }
        }
        y = end;
      }
    }

  if (rim)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!solid(x, y)) continue;
        const i = y * w + x;
        if (!solid(x, y - 1)) factor[i]! *= 1.2;
        else if (!solid(x - 1, y)) factor[i]! *= 1.08;
        if (!solid(x, y + 1)) factor[i]! *= 0.8;
        else if (!solid(x + 1, y)) factor[i]! *= 0.88;
      }

  for (let i = 0; i < w * h; i++) {
    const f = factor[i]!;
    if (f === 1 || src[i * 4 + 3]! < 250) continue;
    const [r, g, b] = toneRgb(src[i * 4]!, src[i * 4 + 1]!, src[i * 4 + 2]!, f);
    d[i * 4] = r;
    d[i * 4 + 1] = g;
    d[i * 4 + 2] = b;
  }

  if (outline)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (src[at(x, y) + 3] !== 0) continue;
        // Prefer the colour below, then beside, then above: outlines under a
        // shape read as its shadow.
        const n = [
          [x, y + 1],
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
        ].find(([nx, ny]) => solid(nx!, ny!));
        if (!n) continue;
        const o = at(n[0]!, n[1]!);
        const [r, g, b] = toneRgb(src[o]!, src[o + 1]!, src[o + 2]!, 0.28);
        const k = at(x, y);
        d[k] = r;
        d[k + 1] = g;
        d[k + 2] = b;
        d[k + 3] = 255;
      }
  c.putImageData(img, 0, 0);
}

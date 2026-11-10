import { type Ctx, ellipse, glow, rect, shade, trap } from './pixel.ts';

export type Body = 'roadster' | 'coupe' | 'hatch';

export const CAR_W = 72;
export const CAR_H = 54;
export const SIDE_W = 84;
export const SIDE_H = 30;

const TYRE = '#15151b';
const GLASS = '#22324a';
const GLASS_HI = '#5b7fa8';

/** Dark 1px outline around everything drawn so far, so sprites read on any ground. */
export function outline(c: Ctx, w: number, h: number, color = '#0d0d14'): void {
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3]! > 100;
  const edge: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (
        !solid(x, y) &&
        (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))
      )
        edge.push(x, y);
  for (let i = 0; i < edge.length; i += 2) rect(c, color, edge[i]!, edge[i + 1]!, 1, 1);
}

/**
 * Rear three-quarter view for the race. `frame` is -2..2: how far the car is
 * yawed (negative = nose left). 72x54, drawn 1:1 for the player's car.
 */
export function drawCarRear(
  c: Ctx,
  body: Body,
  color: string,
  frame: number,
  braking: boolean,
): void {
  const f = Math.max(-2, Math.min(2, Math.round(frame)));
  const ox = f * 3; // the cabin sits ahead of the tail, so it shifts with yaw
  const hi = shade(color, 1.28);
  const lo = shade(color, 0.72);
  const dark = shade(color, 0.5);

  // Flank and front wheel showing on the outside of the turn.
  if (f !== 0) {
    const w = Math.abs(f) * 4;
    if (f > 0) {
      rect(c, TYRE, 5 - w, 34, 6, 13);
      trap(c, lo, 22, 44, 5 - w + 2, 6, 5 - w, 6);
      rect(c, dark, 5 - w, 40, w + 1, 4);
    } else {
      rect(c, TYRE, 61 + w, 34, 6, 13);
      trap(c, lo, 22, 44, 66, 67 + w - 2, 66, 67 + w);
      rect(c, dark, 66, 40, w + 1, 4);
    }
  }

  // Rear tyres.
  for (const x of [8, 52]) {
    rect(c, TYRE, x, 35, 12, 15);
    rect(c, '#2b2b35', x + 3, 36, 1, 13);
    rect(c, '#2b2b35', x + 8, 36, 1, 13);
  }

  // Bumper and valance.
  rect(c, lo, 6, 33, 60, 12);
  rect(c, '#1a1a22', 9, 42, 54, 4);
  rect(c, '#efeee2', 30, 36, 12, 5);
  rect(c, '#55555f', 32, 38, 8, 1);
  rect(c, '#b9b9c6', 47, 44, 6, 3);
  rect(c, '#2a2a30', 48, 45, 4, 1);

  // Boot / tailgate panel.
  trap(c, color, 22, 35, 5, 67, 4, 68);
  rect(c, hi, 6, 22, 60, 2);
  rect(c, lo, 5, 29, 62, 1);
  rect(c, shade(color, 0.82), 4, 32, 64, 3);

  // Cabin by body style.
  if (body === 'coupe') {
    trap(c, color, 10, 22, 18 + ox, 54 + ox, 9 + ox * 0.4, 63 + ox * 0.4);
    trap(c, hi, 6, 10, 23 + ox, 49 + ox, 18 + ox, 54 + ox);
    trap(c, GLASS, 11, 21, 21 + ox, 51 + ox, 14 + ox * 0.5, 58 + ox * 0.5);
    trap(c, GLASS_HI, 12, 17, 25 + ox, 34 + ox, 22 + ox, 29 + ox, 0.85);
    rect(c, dark, 8, 20, 56, 3); // ducktail lip
    rect(c, hi, 8, 20, 56, 1);
  } else if (body === 'hatch') {
    trap(c, color, 5, 22, 13 + ox, 59 + ox, 8 + ox * 0.4, 64 + ox * 0.4);
    rect(c, hi, 14 + ox, 3, 44, 3);
    rect(c, dark, 15 + ox, 5, 42, 2); // roof spoiler shadow
    trap(c, GLASS, 8, 19, 16 + ox, 56 + ox, 13 + ox * 0.5, 59 + ox * 0.5);
    trap(c, GLASS_HI, 9, 14, 19 + ox, 30 + ox, 17 + ox, 26 + ox, 0.85);
    rect(c, '#0f1622', 30 + ox * 0.5, 17, 14, 1); // wiper
    rect(c, braking ? '#ff5a48' : '#7a1515', 31 + ox, 6, 10, 1); // high brake light
    rect(c, '#b0162c', 5, 27, 62, 1); // red pinstripe
  } else {
    // Roadster: open cockpit, windscreen ahead, driver's helmet.
    trap(c, '#7fb2d6', 9, 20, 21 + ox, 51 + ox, 17 + ox, 55 + ox, 0.5);
    rect(c, dark, 20 + ox, 8, 32, 2);
    rect(c, dark, 17 + ox, 9, 2, 12);
    rect(c, dark, 53 + ox, 9, 2, 12);
    rect(c, '#9a9aa8', 21 + ox, 12, 11, 2); // roll hoops
    rect(c, '#9a9aa8', 40 + ox, 12, 11, 2);
    rect(c, '#22222b', 22 + ox, 14, 9, 8); // headrests
    rect(c, '#22222b', 41 + ox, 14, 9, 8);
    ellipse(c, '#f1efe6', 26 + ox, 11, 4, 4);
    rect(c, '#d7263d', 22 + ox, 10, 9, 1);
    rect(c, shade(color, 0.88), 8, 20, 56, 3); // rear deck
    rect(c, hi, 8, 20, 56, 1);
  }

  // Door mirrors.
  rect(c, lo, 2 + ox * 0.4, 19, 3, 3);
  rect(c, lo, 67 + ox * 0.4, 19, 3, 3);

  // Tail lights.
  for (const x of [7, 52]) {
    rect(c, braking ? '#ff3a2c' : '#8a1414', x, 25, 13, 6);
    rect(c, braking ? '#ffd2c4' : '#d2402e', x + 2, 26, braking ? 9 : 4, 2);
    rect(c, '#f2a23a', x === 7 ? x : x + 10, 25, 3, 6, 0.9); // indicator
  }

  outline(c, CAR_W, CAR_H);

  // Shadow underneath, drawn behind everything.
  c.globalCompositeOperation = 'destination-over';
  ellipse(c, '#000000', 36, 50, 34, 3, 0.4);
  c.globalCompositeOperation = 'source-over';

  if (braking) {
    glow(c, '#ff4030', 13, 28, 12, 0.55);
    glow(c, '#ff4030', 58, 28, 12, 0.55);
  }
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

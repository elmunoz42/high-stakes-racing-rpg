import { outline } from './cars.ts';
import { type Ctx, bands, ellipse, finish, limb, makeCanvas, poly, rect, tone } from './pixel.ts';

export interface Look {
  skin: string;
  hair: string;
  top: string;
  legs: string;
  build?: 'broad' | 'lean' | 'slim';
  cut?: 'short' | 'slick' | 'spiky' | 'ponytail' | 'long' | 'bob' | 'bun' | 'buzz' | 'cap';
}
export type Style = 'player' | 'racer' | 'casual' | 'coach' | 'mechanic' | 'parts' | 'sponsor';

export const PLAYER_LOOK: Look = {
  skin: '#c98e6b',
  hair: '#2b2b2b',
  top: '#3a2a22',
  legs: '#2a3550',
  build: 'lean',
  cut: 'slick',
};
export const PERSON_W = 24;
export const PERSON_H = 44;
export const PORTRAIT = 64;

type P = [number, number];

/** Proportions by build: shoulder width, waist, hips, jaw. */
const BUILD = {
  broad: { sh: 16, waist: 10, hip: 9, jaw: 1.6, neck: 4.5 },
  lean: { sh: 14, waist: 8, hip: 8, jaw: 0.8, neck: 3.5 },
  slim: { sh: 11.5, waist: 6.5, hip: 9, jaw: 0, neck: 3 },
};

/**
 * A walking figure facing right. frame 0 = standing, 1..4 = walk cycle.
 *
 * Drawn from angled shapes, not boxes: a tapering heroic frame (wide
 * shoulders, narrow waist, long legs), a chiselled head with a heavy brow, and
 * hard two-tone light from the front, with the back of everything in deep
 * shadow. Boots, jackets and attitude.
 *
 * `k` is the resolution: 1 for the street (24x44), 2 for rooms, where the
 * figure is drawn natively at 48x88 with a face that can carry detail rather
 * than being an enlarged small sprite.
 */
export function drawPerson(c: Ctx, look: Look, style: Style, frame: number, k = 1): void {
  const K = k;
  const B = BUILD[look.build ?? 'lean'];
  const cx = 12;
  const walk = frame === 0 ? 0 : [1, 0, -1, 0][(frame - 1) % 4]!;
  const bob = frame === 2 || frame === 4 ? -1 : 0;
  const X = (x: number) => (cx + x) * K;
  const Y = (y: number) => (y + bob) * K;
  const pt = (x: number, y: number): P => [X(x), Y(y)];
  /** A rectangle in figure units. */
  const R = (col: string, x: number, y: number, w: number, h: number) =>
    rect(c, col, X(x), Y(y), w * K, h * K);
  /** A limb between points already in pixels, widths in figure units. */
  const L = (a: P, b: P, w0: number, w1: number, col: string) => limb(c, a, b, w0 * K, w1 * K, col);
  /** Offset a pixel point by figure units. */
  const off = ([x, y]: P, dx: number, dy: number): P => [x + dx * K, y + dy * K];
  const hd = K >= 2;

  const skin = { lo: tone(look.skin, 0.62), mid: look.skin, hi: tone(look.skin, 1.22) };
  const hair = { lo: tone(look.hair, 0.6), mid: look.hair, hi: tone(look.hair, 1.5) };
  const top = { lo: tone(look.top, 0.55), mid: look.top, hi: tone(look.top, 1.3) };
  const legs = { lo: tone(look.legs, 0.55), mid: look.legs, hi: tone(look.legs, 1.3) };
  const boot = { lo: '#0e0e14', mid: '#24222a', hi: '#5a5864' };
  const coveralls = style === 'mechanic';

  // --- Legs: hip, knee, ankle, then a chunky boot.
  const legAt = (side: number) => {
    const s = side * walk; // +1 forward, -1 back
    return {
      hip: pt(side * 1.5, 30),
      knee: pt(side * 1.2 + s * 2.5, 35.5),
      ankle: pt(side * 0.5 + s * 3.5, 40.5 - (s > 0 ? 0.5 : 0)),
    };
  };
  const drawLeg = (side: number, far: boolean) => {
    const { hip, knee, ankle } = legAt(side);
    const col = far ? legs.lo : legs.mid;
    L(hip, knee, 4.5, 3.6, col);
    L(knee, ankle, 3.6, 3, col);
    if (!far) L(off(knee, 1, 0), off(ankle, 1, -1), 1, 1, legs.hi);
    if (!far && hd) L(off(hip, -1.4, 1), off(knee, -1, 0), 0.5, 0.5, legs.lo); // seam
    poly(
      c,
      [
        off(ankle, -2, -1),
        off(ankle, 1.5, -1),
        off(ankle, 4, 1.5),
        off(ankle, 4, 3),
        off(ankle, -2.5, 3),
      ],
      far ? boot.lo : boot.mid,
    );
    if (!far) {
      const [bx, by] = off(ankle, 1, 1);
      rect(c, boot.hi, bx, by, 2 * K, K);
      if (hd) rect(c, '#08080c', ...off(ankle, -2.5, 2.5), 6.5 * K, 0.5 * K); // sole
    }
  };
  drawLeg(-1, true);

  // --- Arms: shoulder, elbow, fist.
  const shoulderF = pt(B.sh / 2 - 2.5, 17.5);
  const shoulderB = pt(-B.sh / 2 + 2.5, 17.5);
  const armAt = (sh: P, swing: number) => ({
    elbow: off(sh, swing * 2, 6.5),
    hand: off(sh, swing * 3.5 + 1, 12.5),
  });
  const fist = (h: P, col: string) =>
    poly(c, [off(h, -1.6, -1), off(h, 1.6, -1), off(h, 1.4, 2.2), off(h, -1.2, 2.2)], col);
  const far = armAt(shoulderB, walk);
  L(shoulderB, far.elbow, 4, 3.4, top.lo);
  L(far.elbow, far.hand, 3.4, 2.8, coveralls ? skin.lo : top.lo);
  fist(far.hand, skin.lo);

  drawLeg(1, false);

  // --- Torso: a V from the shoulders to the waist, then hips.
  const sh = B.sh / 2;
  const w = B.waist / 2;
  const torsoCol = coveralls ? legs : top;
  poly(
    c,
    [
      pt(-sh + 1, 18),
      pt(-sh + 3, 16),
      pt(-1.5, 15),
      pt(2.5, 15),
      pt(sh - 1, 16),
      pt(sh - 0.5, 18.5),
      pt(sh - 1.5, 22),
      pt(w + 0.5, 28),
      pt(-w - 0.5, 28),
      pt(-sh + 1.5, 22),
    ],
    torsoCol.mid,
  );
  poly(
    c,
    [
      pt(-sh + 1, 18),
      pt(-sh + 3, 16),
      pt(-2, 15.5),
      pt(-1.5, 28),
      pt(-w - 0.5, 28),
      pt(-sh + 1.5, 22),
    ],
    torsoCol.lo,
  );
  poly(
    c,
    [
      pt(sh - 1, 16),
      pt(sh - 0.5, 18.5),
      pt(sh - 1.5, 22),
      pt(w + 0.5, 28),
      pt(w - 1, 28),
      pt(sh - 3, 22),
      pt(sh - 2.5, 17),
    ],
    torsoCol.hi,
  );
  if (hd) L(pt(0.5, 19), pt(-0.5, 27.5), 0.5, 0.5, torsoCol.lo); // fold
  const hp = B.hip / 2;
  poly(c, [pt(-w - 0.5, 28), pt(w + 0.5, 28), pt(hp, 31), pt(-hp, 31)], legs.mid);
  poly(c, [pt(-w - 0.5, 28), pt(-1, 28), pt(-1, 31), pt(-hp, 31)], legs.lo);
  R('#141218', -w - 0.5, 28, B.waist + 1, 1);
  R('#d8c070', w - 2, 28, 2, 1);

  // --- Outfit by role.
  if (style === 'player' || style === 'racer') {
    poly(c, [pt(-2, 15), pt(3, 15), pt(4, 17.5), pt(1, 19), pt(-2.5, 17)], top.hi); // collar
    poly(c, [pt(2.5, 17), pt(4.5, 17), pt(w, 28), pt(w - 2, 28)], tone(look.top, 0.75)); // open front
    R(top.hi, sh - 2, 19, 1, 6);
    if (hd) R('#c8c8d4', 3, 18, 0.5, 9); // zip
    if (style === 'racer')
      poly(c, [pt(-sh + 2, 19), pt(-sh + 3, 19), pt(-1, 27), pt(-2, 27)], '#d7263d');
  } else if (style === 'casual') {
    poly(c, [pt(-1.5, 15), pt(3, 15), pt(1, 17)], skin.lo);
  } else if (style === 'sponsor') {
    poly(c, [pt(-0.5, 15), pt(3, 15), pt(2, 23), pt(0.5, 23)], '#f4f4f4');
    poly(c, [pt(1, 16), pt(2, 16), pt(1.8, 21.5), pt(1.2, 22.5), pt(0.8, 21.5)], '#c6ff2e');
    poly(c, [pt(3, 15), pt(4.5, 16), pt(2.5, 22)], top.hi);
  } else if (style === 'coach') {
    poly(c, [pt(-2, 15), pt(3, 15), pt(2, 17), pt(-1.5, 17)], '#2b2b33');
    R('#e8e4d8', 2, 17, 1, 4);
    R('#c8c8d4', 1, 21, 2, 1);
  } else if (style === 'parts') {
    poly(c, [pt(-w + 0.5, 20), pt(w + 0.5, 20), pt(hp + 0.5, 33), pt(-hp + 1, 33)], '#f2f2ee');
    poly(c, [pt(-w + 0.5, 20), pt(-1, 20), pt(-1, 33), pt(-hp + 1, 33)], '#c8c8c4');
  } else if (coveralls) {
    poly(c, [pt(-sh + 3, 16), pt(sh - 1, 16), pt(sh - 1.5, 19), pt(-sh + 2, 19)], top.mid);
    R(legs.hi, -2, 16, 1, 4);
    R(legs.hi, 3, 16, 1, 4);
    poly(c, [pt(-w, 24), pt(-w + 2, 24), pt(-w + 2, 28), pt(-w + 0.5, 27)], '#d7263d');
  }

  // --- Neck and head. Heads are drawn at 80% around the neck: a smaller head
  // reads taller and more heroic than a big round one.
  const HX = (x: number) => X(x * 0.8 + 0.4);
  const HY = (y: number) => Y(3.2 + y * 0.8);
  const ph = (x: number, y: number): P => [HX(x), HY(y)];
  const HR = (col: string, x: number, y: number, ww: number, hh: number) =>
    rect(c, col, HX(x), HY(y), ww * K * 0.8, hh * K * 0.8);
  poly(
    c,
    [
      pt(-B.neck / 2, 12.5),
      pt(B.neck / 2 + 0.5, 12.5),
      pt(B.neck / 2 + 0.5, 15.5),
      pt(-B.neck / 2, 15.5),
    ],
    skin.lo,
  );
  const jaw = B.jaw;
  poly(
    c,
    [
      ph(-4.5, 5),
      ph(-2.5, 1.5),
      ph(3, 1.5),
      ph(5.5, 4),
      ph(6, 6.5),
      ph(7.5, 8.5),
      ph(6.2, 9.4),
      ph(6.5, 10.6),
      ph(5.8, 11.4),
      ph(5.2 + jaw * 0.2, 13),
      ph(1 - jaw, 13.6),
      ph(-2.5, 12),
      ph(-4.5, 9),
    ],
    skin.mid,
  );
  poly(
    c,
    [
      ph(-4.5, 5),
      ph(-2.5, 1.5),
      ph(0.5, 1.5),
      ph(1.5, 7),
      ph(1 - jaw, 13.6),
      ph(-2.5, 12),
      ph(-4.5, 9),
    ],
    skin.lo,
  );
  poly(c, [ph(3, 2), ph(5.5, 4), ph(6, 6.5), ph(4.5, 7)], skin.hi);
  poly(c, [ph(3.5, 8.5), ph(5.2, 8.2), ph(4.8, 10.5)], skin.hi);
  poly(c, [ph(6, 6.5), ph(7.5, 8.5), ph(6.2, 9.4)], skin.hi);
  // Brow, eye, mouth, ear. A thin brow sits clear of the eye.
  poly(c, [ph(2.5, 5), ph(6, 5.3), ph(6, 5.9), ph(2.8, 5.8)], hair.lo);
  if (hd) {
    HR('#f2ece4', 3.4, 6.6, 2.4, 1.1);
    HR('#2a1a12', 4.6, 6.4, 1.2, 1.4);
    HR('#ffffff', 5.1, 6.5, 0.6, 0.6);
    if (look.build === 'slim') HR('#140c0c', 3.2, 6.1, 2.8, 0.6);
    HR(tone(look.skin, 0.45), 6.3, 9.1, 0.8, 0.5); // nostril
    HR(look.build === 'slim' ? '#a83a3a' : tone(look.skin, 0.5), 4.4, 11, 2.2, 0.7);
    HR(tone(look.skin, 1.1), 4.6, 11.7, 1.6, 0.4);
  } else {
    HR('#140c0c', 3.8, 6.6, 2, 1);
    HR(tone(look.skin, 0.45), 4.5, 11, 2, 1);
  }
  poly(c, [ph(-1.8, 7.5), ph(-0.5, 7.5), ph(-0.3, 10), ph(-1.8, 9.8)], tone(look.skin, 0.5));
  if (look.build === 'broad' && style === 'mechanic')
    poly(c, [ph(3.5, 10), ph(7, 10.2), ph(6.5, 11), ph(4, 10.9)], hair.mid);
  if (look.build === 'broad' && hd)
    for (let i = 0; i < 6; i++)
      HR(tone(look.skin, 0.78), 2 + ((i * 1.7) % 4), 11.6 + (i % 2), 0.5, 0.5); // stubble

  drawHair(c, look, hair, ph, K * 0.8, hd);

  if (style === 'sponsor') {
    poly(c, [ph(2.5, 5.8), ph(7, 5.8), ph(6.8, 7.6), ph(3, 7.6)], '#0c0c12');
    HR('#8a8aa8', 4, 6, 2, hd ? 0.6 : 1);
  }

  // --- Near arm, last: sleeve, forearm, fist.
  const near = armAt(shoulderF, -walk);
  L(shoulderF, near.elbow, 4.2, 3.6, top.mid);
  L(off(shoulderF, 1.2, 1), off(near.elbow, 1.2, 0), 1, 1, top.hi);
  L(near.elbow, near.hand, 3.6, 3, coveralls ? skin.mid : top.mid);
  if (style === 'player' || style === 'racer') L(near.elbow, near.hand, 1, 1, tone(look.top, 0.75));
  const h0 = near.hand;
  fist(h0, skin.mid);
  rect(c, skin.hi, ...off(h0, 0, -1), K, K);
  const box = (dx0: number, dy0: number, dx1: number, dy1: number, col: string) =>
    poly(c, [off(h0, dx0, dy0), off(h0, dx1, dy0), off(h0, dx1, dy1), off(h0, dx0, dy1)], col);
  if (style === 'coach') {
    box(0, -6, 5, 1, '#7a5a32');
    box(1, -5, 4, 0, '#f2eee2');
    if (hd) for (let i = 0; i < 3; i++) box(1.5, -4 + i * 1.3, 3.5, -3.6 + i * 1.3, '#9a9aa8');
  } else if (style === 'sponsor') {
    box(0.5, -3, 2.5, 1, '#7b2cff');
    box(0.5, -2, 2.5, -1.3, '#c6ff2e');
  } else if (style === 'mechanic') {
    L(off(h0, 1, 0), off(h0, 2, 6), 1.2, 1.2, '#a8a8b8');
    rect(c, '#e0e0ea', ...off(h0, 1, 6), 2 * K, K);
  }

  outline(c, PERSON_W * K, PERSON_H * K);
  c.globalCompositeOperation = 'destination-over';
  ellipse(c, '#000000', (cx + 1) * K, 43 * K, 8 * K, 1.2 * K, 0.45);
  c.globalCompositeOperation = 'source-over';
}

/** Hair by cut, with a lit streak along the crown. `s` is pixels per head unit. */
function drawHair(
  c: Ctx,
  look: Look,
  hair: { lo: string; mid: string; hi: string },
  pt: (x: number, y: number) => P,
  s: number,
  hd: boolean,
): void {
  const cut = look.cut ?? 'short';
  const shapes: Record<string, P[]> = {
    short: [
      pt(-5, 8),
      pt(-5, 3.5),
      pt(-2.5, 0.5),
      pt(3, 0.3),
      pt(6, 2.5),
      pt(5, 3.8),
      pt(1, 2.8),
      pt(-0.5, 5),
      pt(-2, 9.5),
      pt(-4.5, 10),
    ],
    slick: [
      pt(-5.5, 9),
      pt(-5.5, 3),
      pt(-1.5, -0.5),
      pt(4, -0.5),
      pt(7, 2),
      pt(5.5, 3.2),
      pt(1, 2.5),
      pt(-1.5, 5.5),
      pt(-2.5, 10.5),
    ],
    spiky: [
      pt(-5.5, 8),
      pt(-6.5, 2.5),
      pt(-4, 2),
      pt(-4, -1),
      pt(-1.5, 0.8),
      pt(0, -2),
      pt(2, 0.5),
      pt(4.5, -1.5),
      pt(5, 1.5),
      pt(7.5, 1.5),
      pt(5.5, 3.6),
      pt(1, 2.8),
      pt(-1, 5),
      pt(-2.5, 9.5),
    ],
    ponytail: [
      pt(-5, 8),
      pt(-5, 3.5),
      pt(-2.5, 0.5),
      pt(3, 0.3),
      pt(6.2, 3),
      pt(5, 4),
      pt(1, 2.8),
      pt(-0.5, 5),
      pt(-2, 9.5),
    ],
    long: [
      pt(-6, 16),
      pt(-6.2, 4),
      pt(-2.5, 0.2),
      pt(3.5, 0.2),
      pt(6.5, 3.2),
      pt(5, 4),
      pt(1, 3),
      pt(-0.5, 6),
      pt(-0.5, 12),
      pt(-1.5, 16),
    ],
    bob: [
      pt(-6, 12.5),
      pt(-6, 4),
      pt(-2.5, 0.3),
      pt(3.5, 0.3),
      pt(6.8, 3.5),
      pt(5.2, 4.5),
      pt(1, 3),
      pt(0, 7),
      pt(0.5, 12.5),
    ],
    bun: [
      pt(-5, 8),
      pt(-5, 3.5),
      pt(-2.5, 0.8),
      pt(3, 0.8),
      pt(5.8, 3),
      pt(4.8, 3.8),
      pt(1, 2.8),
      pt(-0.5, 5),
      pt(-2, 9),
    ],
    buzz: [
      pt(-4.8, 6),
      pt(-2.5, 1.2),
      pt(3, 1.2),
      pt(5.2, 2.8),
      pt(1, 2.6),
      pt(-1.5, 4),
      pt(-3, 7.5),
    ],
    cap: [pt(-5, 9), pt(-5, 4), pt(-3, 4), pt(-2, 9.5)],
  };
  poly(c, shapes[cut] ?? shapes.short!, hair.mid);
  if (cut === 'ponytail') {
    poly(c, [pt(-5, 4), pt(-3.5, 3.5), pt(-6.5, 12), pt(-8.5, 11)], hair.mid);
    poly(c, [pt(-4.8, 4.5), pt(-4.2, 4.5), pt(-7, 11), pt(-7.6, 10.5)], hair.lo);
  }
  if (cut === 'bun') {
    const [bx, by] = pt(-4.5, 2.5);
    ellipse(c, hair.mid, bx, by, 2.5 * s, 2.2 * s);
    const [hx, hy] = pt(-5.5, 1);
    rect(c, hair.hi, hx, hy, 2 * s, s);
  }
  if (cut === 'cap') {
    poly(
      c,
      [
        pt(-5, 4.5),
        pt(-4.5, 1),
        pt(-1, -0.5),
        pt(3.5, -0.3),
        pt(5.5, 2),
        pt(5.5, 3.6),
        pt(-5, 4.5),
      ],
      '#f2a541',
    );
    poly(c, [pt(3.5, 2.5), pt(9, 3), pt(8.5, 4), pt(3.5, 4)], tone('#f2a541', 0.65));
    const [lx, ly] = pt(0, 0.8);
    rect(c, '#ffffff', lx, ly, 2 * s, 2 * s);
    return;
  }
  poly(c, [pt(-5, 6), pt(-3, 5), pt(-2.5, 9.5), pt(-4.5, 9.5)], hair.lo);
  poly(c, [pt(-2, 0.8), pt(3, 0.5), pt(4.5, 1.5), pt(0, 1.8)], hair.hi);
  if (hd)
    // Strands combed back from the hairline.
    for (const [x0, y0, x1, y1] of [
      [2, 1.2, -3, 3.5],
      [4, 2, -1, 4.5],
      [0, 1, -4, 6],
    ] as const)
      limb(c, pt(x0, y0), pt(x1, y1), 0.45 * s, 0.3 * s, hair.lo);
}

/**
 * Head-and-shoulders portrait for the dialogue panel, 64x64. Three-quarter
 * view, split-lit: the face's far side falls into hard shadow down the line
 * of the nose, the near side catches a warm key light, a cool rim light picks
 * out the edge against the background.
 */
export function drawPortrait(c: Ctx, look: Look, style: Style, bg: string): void {
  const S = PORTRAIT;
  bands(
    c,
    0,
    0,
    S,
    S,
    [
      [0, tone(bg, 0.35)],
      [0.7, tone(bg, 0.8)],
      [1, tone(bg, 1.05)],
    ],
    16,
  );
  // Diagonal light rays behind the head.
  poly(
    c,
    [
      [S, 0],
      [S, 18],
      [20, S],
      [6, S],
    ],
    tone(bg, 1.15),
    0.25,
  );

  const fig = makeCanvas(S, S);
  const f = fig.ctx;
  const build = look.build ?? 'lean';
  const jaw = build === 'broad' ? 3 : build === 'lean' ? 1.5 : 0;
  const skin = { lo: tone(look.skin, 0.58), mid: look.skin, hi: tone(look.skin, 1.2) };
  const hair = { lo: tone(look.hair, 0.55), mid: look.hair, hi: tone(look.hair, 1.5) };
  const top = { lo: tone(look.top, 0.5), mid: look.top, hi: tone(look.top, 1.3) };
  const P = (x: number, y: number): [number, number] => [x, y];

  // Shoulders and jacket.
  const sh = build === 'broad' ? 30 : build === 'lean' ? 27 : 23;
  const body =
    style === 'mechanic'
      ? { lo: tone(look.legs, 0.5), mid: look.legs, hi: tone(look.legs, 1.3) }
      : top;
  poly(
    f,
    [P(32 - sh, S), P(32 - sh + 4, 50), P(24, 46), P(42, 46), P(32 + sh - 2, 50), P(32 + sh, S)],
    body.mid,
  );
  poly(f, [P(32 - sh, S), P(32 - sh + 4, 50), P(24, 46), P(30, 47), P(26, S)], body.lo);
  poly(f, [P(44, 47), P(32 + sh - 2, 50), P(32 + sh, S), P(32 + sh - 4, S), P(42, 50)], body.hi);
  // Neck in shadow under the jaw.
  poly(f, [P(26, 40), P(40, 40), P(41, 49), P(25, 49)], skin.lo);
  poly(f, [P(34, 42), P(40, 40), P(41, 48), P(35, 48)], skin.mid);

  // Outfit at the collar.
  if (style === 'player' || style === 'racer') {
    poly(f, [P(22, 45), P(28, 43), P(31, 52), P(25, 56)], body.hi); // popped collar
    poly(f, [P(44, 43), P(48, 46), P(43, 56), P(38, 50)], body.hi);
    if (style === 'racer')
      poly(
        f,
        [P(32 - sh + 6, 58), P(32 - sh + 9, 54), P(32 - sh + 11, 56), P(32 - sh + 8, S)],
        '#d7263d',
      );
  } else if (style === 'sponsor') {
    poly(f, [P(29, 47), P(39, 47), P(36, S), P(32, S)], '#f4f4f4');
    poly(f, [P(33, 49), P(35, 49), P(36, 60), P(34, 62), P(32, 60)], '#c6ff2e');
    poly(f, [P(26, 47), P(30, 47), P(33, S), P(27, S)], body.hi);
  } else if (style === 'mechanic') {
    poly(f, [P(22, 49), P(42, 47), P(46, 51), P(20, 53)], top.mid); // shirt at the shoulders
    rect(f, body.hi, 25, 50, 3, 14);
    rect(f, body.hi, 38, 50, 3, 14);
    rect(f, '#d8d8e4', 25, 54, 3, 2);
    rect(f, '#d8d8e4', 38, 54, 3, 2);
  } else if (style === 'parts') {
    poly(f, [P(26, 50), P(40, 50), P(42, S), P(24, S)], '#f2f2ee');
  } else if (style === 'coach') {
    poly(f, [P(25, 46), P(32, 49), P(39, 46), P(40, 50), P(32, 53), P(24, 50)], '#2b2b33');
  }

  // Head: three-quarter, chin and cheekbone towards the light (right).
  const head: [number, number][] = [
    P(19, 22),
    P(22, 11),
    P(32, 6),
    P(42, 8),
    P(47, 15),
    P(48, 23),
    P(50, 29), // nose
    P(47.5, 32),
    P(47, 36),
    P(44 + jaw * 0.3, 41 + jaw * 0.3), // chin
    P(36, 44),
    P(28 - jaw, 41),
    P(22 - jaw * 0.5, 34),
  ];
  poly(f, head, skin.mid);
  // Hard shadow on the far side, along the line of the nose.
  poly(
    f,
    [
      P(19, 22),
      P(22, 11),
      P(30, 7),
      P(37, 18),
      P(39, 30),
      P(37, 40),
      P(36, 44),
      P(28 - jaw, 41),
      P(22 - jaw * 0.5, 34),
    ],
    skin.lo,
  );
  // Key light: forehead, cheekbone, nose ridge, chin.
  poly(f, [P(40, 9), P(46, 14), P(46, 19), P(41, 17)], skin.hi);
  poly(f, [P(41, 27), P(46, 25), P(46, 30), P(42, 31)], skin.hi);
  poly(f, [P(44, 21), P(48, 22), P(50, 29), P(46, 28)], skin.hi);
  poly(f, [P(41, 38), P(45, 37), P(44, 41), P(41, 41)], skin.hi);
  // Ear on the shadow side.
  poly(f, [P(20, 24), P(24, 23), P(25, 31), P(21, 31)], tone(look.skin, 0.48));
  if (jaw >= 3)
    for (let i = 0; i < 14; i++)
      rect(f, tone(look.skin, 0.75), 33 + ((i * 5) % 12), 36 + ((i * 3) % 6), 1, 1); // stubble

  // Brows: heavy and angled; eyes deep-set with a catch-light.
  const browCol = tone(look.hair, build === 'slim' ? 0.75 : 0.6);
  poly(f, [P(29, 20), P(37, 19), P(37, 21.5), P(30, 22)], browCol);
  poly(f, [P(40, 19), P(47, 19.5), P(46.5, 21.5), P(40.5, 21.5)], browCol);
  for (const [ex, ey, w] of [
    [31, 24, 5],
    [41, 24, 4.5],
  ] as const) {
    poly(f, [P(ex, ey), P(ex + w, ey - 0.5), P(ex + w, ey + 2), P(ex, ey + 2)], '#f2ece4');
    rect(f, '#2a1a12', Math.round(ex + w - 3), ey - 1, 2, 3);
    rect(f, '#ffffff', Math.round(ex + w - 2), ey - 1, 1, 1);
    if (build === 'slim') rect(f, '#140c0c', Math.round(ex), ey - 1, Math.round(w), 1); // lashes
  }
  // Nose shadow and mouth.
  poly(f, [P(43, 29), P(47, 31.5), P(43, 32)], tone(look.skin, 0.5));
  const lip = build === 'slim' ? tone('#b0302c', 0.9) : tone(look.skin, 0.45);
  poly(f, [P(36, 36), P(45, 35.5), P(44.5, 37), P(37, 37.2)], lip);
  if (style === 'mechanic') poly(f, [P(35, 33.5), P(46, 33), P(45.5, 35.5), P(36, 35.8)], hair.mid);
  if (style === 'sponsor') {
    poly(f, [P(28, 22), P(48, 21), P(47.5, 27), P(29, 27.5)], '#0c0c12'); // shades
    poly(f, [P(41, 22.5), P(46, 22.3), P(45.5, 24), P(41, 24.2)], '#6a6a90');
  }
  if (style === 'parts') rect(f, '#ffcc33', 21, 32, 2, 3); // earring

  portraitHair(f, look, hair, P);
  finish(f, S, S);
  c.drawImage(fig.canvas, 0, 0, S, S);
  // Cool rim light down the shadow edge of the head.
  rect(c, tone(bg, 1.6), 18, 22, 1, 10, 0.6);

  rect(c, '#0d0d14', 0, 0, S, 1);
  rect(c, '#0d0d14', 0, S - 1, S, 1);
  rect(c, '#0d0d14', 0, 0, 1, S);
  rect(c, '#0d0d14', S - 1, 0, 1, S);
}

function portraitHair(
  f: Ctx,
  look: Look,
  hair: { lo: string; mid: string; hi: string },
  P: (x: number, y: number) => [number, number],
): void {
  const cut = look.cut ?? 'short';
  if (cut === 'cap') {
    poly(f, [P(18, 18), P(20, 8), P(30, 3), P(42, 4), P(48, 11), P(48, 16), P(18, 18)], '#f2a541');
    poly(f, [P(36, 14), P(58, 15), P(56, 18), P(36, 18)], tone('#f2a541', 0.62));
    poly(f, [P(26, 6), P(36, 4), P(36, 6), P(27, 8)], tone('#f2a541', 1.3));
    rect(f, '#ffffff', 31, 9, 4, 4);
    poly(f, [P(19, 18), P(23, 18), P(23, 30), P(19, 28)], hair.mid); // grey at the temple
    return;
  }
  const shapes: Record<string, [number, number][]> = {
    short: [
      P(18, 26),
      P(18, 13),
      P(25, 6),
      P(36, 3),
      P(46, 7),
      P(49, 14),
      P(44, 12),
      P(36, 11),
      P(29, 13),
      P(25, 20),
      P(22, 29),
    ],
    slick: [
      P(17, 28),
      P(17, 12),
      P(24, 4),
      P(36, 1),
      P(47, 4),
      P(51, 11),
      P(46, 11),
      P(38, 9),
      P(29, 12),
      P(25, 20),
      P(22, 30),
    ],
    spiky: [
      P(17, 26),
      P(15, 12),
      P(21, 11),
      P(20, 3),
      P(27, 7),
      P(30, -1),
      P(35, 5),
      P(41, 0),
      P(42, 6),
      P(50, 5),
      P(48, 13),
      P(40, 11),
      P(30, 13),
      P(25, 20),
      P(22, 29),
    ],
    ponytail: [
      P(18, 26),
      P(18, 13),
      P(25, 6),
      P(36, 3),
      P(46, 7),
      P(49, 15),
      P(43, 12),
      P(35, 11),
      P(29, 13),
      P(25, 20),
      P(22, 29),
    ],
    long: [
      P(14, 56),
      P(15, 16),
      P(22, 6),
      P(34, 2),
      P(46, 6),
      P(50, 16),
      P(44, 12),
      P(34, 12),
      P(28, 16),
      P(26, 34),
      P(24, 56),
    ],
    bob: [
      P(15, 42),
      P(15, 14),
      P(22, 5),
      P(35, 2),
      P(47, 6),
      P(51, 18),
      P(47, 30),
      P(46, 18),
      P(38, 12),
      P(30, 14),
      P(27, 24),
      P(26, 42),
    ],
    bun: [
      P(18, 24),
      P(18, 13),
      P(25, 7),
      P(36, 4),
      P(46, 8),
      P(48, 14),
      P(43, 12),
      P(35, 11),
      P(28, 13),
      P(24, 20),
      P(22, 27),
    ],
    buzz: [
      P(19, 22),
      P(21, 12),
      P(28, 7),
      P(38, 5),
      P(46, 9),
      P(47, 13),
      P(38, 10),
      P(29, 12),
      P(24, 18),
    ],
  };
  poly(f, shapes[cut] ?? shapes.short!, hair.mid);
  if (cut === 'ponytail') poly(f, [P(18, 14), P(22, 12), P(14, 40), P(9, 38)], hair.mid);
  if (cut === 'bun') ellipse(f, hair.mid, 18, 10, 6, 5);
  // Shadow side and a lit streak across the crown.
  poly(f, [P(17, 16), P(24, 9), P(26, 18), P(22, 28)], hair.lo);
  poly(f, [P(27, 6), P(38, 3), P(44, 6), P(33, 7)], hair.hi);
  poly(f, [P(39, 8), P(45, 9), P(47, 12), P(42, 11)], hair.hi);
}

export const styleForRole = (role: string): Style =>
  role === 'coach' || role === 'mechanic' || role === 'parts' || role === 'sponsor'
    ? role
    : role === 'racer'
      ? 'racer'
      : role === 'local' || role === 'dealer'
        ? 'casual'
        : 'player';

import { outline } from './cars.ts';
import { type Ctx, bands, ellipse, rect, shade } from './pixel.ts';

export interface Look {
  skin: string;
  hair: string;
  top: string;
  legs: string;
}
export type Style = 'player' | 'coach' | 'mechanic' | 'parts' | 'sponsor';

export const PLAYER_LOOK: Look = {
  skin: '#c98e6b',
  hair: '#2b2b2b',
  top: '#ffcc33',
  legs: '#2a3550',
};
export const PERSON_W = 20;
export const PERSON_H = 36;
export const PORTRAIT = 48;

/** A walking figure facing right. frame 0 = standing, 1..4 = walk cycle. */
export function drawPerson(c: Ctx, look: Look, style: Style, frame: number): void {
  const stride = frame === 0 ? 0 : [3, 0, -3, 0][(frame - 1) % 4]!;
  const lift = frame === 2 || frame === 4 ? -1 : 0;
  const bob = lift;
  const shoe = '#1c1c22';
  // Legs.
  const leg = (dx: number, up: number, dark: boolean) => {
    rect(c, dark ? shade(look.legs, 0.75) : look.legs, 8 + dx, 24 + bob, 4, 9 - up);
    rect(c, shoe, 8 + dx, 33 + bob - up, 5, 2);
  };
  leg(-stride, stride < 0 ? 1 : 0, true);
  leg(stride, stride > 0 ? 1 : 0, false);
  // Torso.
  rect(c, look.top, 6, 14 + bob, 9, 11);
  rect(c, shade(look.top, 0.8), 6, 22 + bob, 9, 3);
  if (style === 'mechanic') {
    rect(c, look.legs, 7, 17 + bob, 7, 8); // overalls bib
    rect(c, shade(look.legs, 1.3), 8, 15 + bob, 1, 3);
    rect(c, shade(look.legs, 1.3), 12, 15 + bob, 1, 3);
  } else if (style === 'sponsor') {
    rect(c, '#f4f4f4', 10, 14 + bob, 2, 6); // shirt under blazer
    rect(c, '#c6ff2e', 10, 15 + bob, 2, 2);
  } else if (style === 'player') {
    rect(c, '#d7263d', 6, 18 + bob, 9, 2); // jacket stripe
  } else if (style === 'parts') {
    rect(c, '#f4f4f4', 7, 19 + bob, 7, 6); // apron
  } else if (style === 'coach') {
    rect(c, '#2b2b33', 6, 14 + bob, 9, 2); // collar
  }
  // Near arm swings against the legs.
  const ax = 9 - Math.sign(stride) * 2;
  rect(c, shade(look.top, 0.72), ax, 15 + bob, 3, 7);
  rect(c, look.skin, ax, 22 + bob, 3, 2);
  if (style === 'coach') rect(c, '#e8e4d8', ax + 2, 19 + bob, 4, 5); // clipboard
  if (style === 'sponsor') rect(c, '#7b2cff', ax + 2, 20 + bob, 2, 4); // can
  if (style === 'mechanic') rect(c, '#b9b9c6', ax + 2, 22 + bob, 1, 5); // wrench
  // Head.
  rect(c, look.skin, 6, 5 + bob, 9, 9);
  rect(c, shade(look.skin, 0.85), 6, 12 + bob, 9, 2);
  rect(c, look.hair, 5, 3 + bob, 10, 4);
  rect(c, look.hair, 5, 5 + bob, 2, 6);
  rect(c, '#1a1a1a', 12, 8 + bob, 1, 2);
  if (style === 'parts') {
    rect(c, look.hair, 3, 6 + bob, 3, 3); // ponytail
    rect(c, look.hair, 2, 8 + bob, 2, 6);
  } else if (style === 'coach') {
    rect(c, '#f2a541', 5, 2 + bob, 10, 3); // cap
    rect(c, '#f2a541', 14, 4 + bob, 4, 1);
  } else if (style === 'sponsor') {
    rect(c, '#15151b', 10, 8 + bob, 6, 2); // sunglasses
  } else if (style === 'mechanic') {
    rect(c, look.hair, 11, 11 + bob, 4, 1); // moustache
  }
  outline(c, PERSON_W, PERSON_H);
  c.globalCompositeOperation = 'destination-over';
  ellipse(c, '#000000', 10, 34, 8, 1, 0.35);
  c.globalCompositeOperation = 'source-over';
}

/** Head-and-shoulders portrait for the dialogue panel. */
export function drawPortrait(c: Ctx, look: Look, style: Style, bg: string): void {
  const S = PORTRAIT;
  bands(
    c,
    0,
    0,
    S,
    S,
    [
      [0, shade(bg, 0.55)],
      [1, shade(bg, 1.05)],
    ],
    12,
  );
  // Shoulders and neck.
  rect(c, look.top, 6, 38, 36, 10);
  rect(c, shade(look.top, 1.2), 6, 38, 36, 1);
  rect(c, shade(look.top, 0.75), 6, 44, 36, 4);
  rect(c, shade(look.skin, 0.85), 20, 32, 8, 7);
  // Head.
  ellipse(c, look.skin, 24, 22, 11, 13);
  rect(c, shade(look.skin, 0.9), 14, 26, 20, 8, 0.5);
  rect(c, look.skin, 11, 20, 3, 6);
  rect(c, look.skin, 34, 20, 3, 6); // ears
  // Face.
  rect(c, '#ffffff', 17, 20, 5, 3);
  rect(c, '#ffffff', 26, 20, 5, 3);
  rect(c, '#2a1f18', 19, 20, 2, 3);
  rect(c, '#2a1f18', 28, 20, 2, 3);
  rect(c, shade(look.hair, 0.8), 16, 17, 6, 1);
  rect(c, shade(look.hair, 0.8), 26, 17, 6, 1);
  rect(c, shade(look.skin, 0.75), 23, 23, 2, 4);
  rect(c, '#8a3a3a', 20, 30, 8, 1);
  // Hair.
  ellipse(c, look.hair, 24, 12, 12, 6);
  rect(c, look.hair, 12, 12, 3, 8);
  rect(c, look.hair, 33, 12, 3, 8);
  if (style === 'coach') {
    rect(c, '#f2a541', 11, 6, 26, 7);
    rect(c, '#d98a2b', 11, 12, 30, 2); // cap and brim
    rect(c, '#ffffff', 21, 8, 6, 3);
    rect(c, '#2b2b33', 6, 38, 36, 2);
    rect(c, '#8a3a3a', 20, 30, 8, 1);
    rect(c, look.skin, 20, 30, 2, 1); // unimpressed
  } else if (style === 'mechanic') {
    rect(c, look.hair, 18, 28, 12, 2); // moustache
    rect(c, look.legs, 12, 40, 5, 8);
    rect(c, look.legs, 31, 40, 5, 8); // overall straps
    rect(c, '#b9b9c6', 13, 41, 3, 2);
    rect(c, '#b9b9c6', 32, 41, 3, 2);
    rect(c, '#8a3a3a', 20, 31, 8, 1);
    rect(c, '#8a3a3a', 19, 30, 1, 1);
    rect(c, '#8a3a3a', 28, 30, 1, 1); // smile
  } else if (style === 'parts') {
    ellipse(c, look.hair, 38, 20, 4, 9); // ponytail
    rect(c, '#ffcc33', 10, 26, 2, 3);
    rect(c, '#ffcc33', 36, 26, 2, 3); // earrings
    rect(c, '#b0302c', 20, 30, 8, 2); // lipstick grin
    rect(c, '#f4f4f4', 14, 42, 20, 6);
  } else if (style === 'sponsor') {
    rect(c, '#15151b', 14, 19, 20, 5);
    rect(c, '#3a3a48', 16, 20, 5, 2);
    rect(c, '#3a3a48', 27, 20, 5, 2); // shades
    rect(c, '#f4f4f4', 20, 38, 8, 10);
    rect(c, '#c6ff2e', 23, 40, 2, 8); // shirt and tie
    rect(c, '#ffffff', 20, 30, 8, 2); // big smile
  }
  rect(c, '#0d0d14', 0, 0, S, 1);
  rect(c, '#0d0d14', 0, S - 1, S, 1);
  rect(c, '#0d0d14', 0, 0, 1, S);
  rect(c, '#0d0d14', S - 1, 0, 1, S);
}

export const styleForRole = (role: string): Style =>
  role === 'coach' || role === 'mechanic' || role === 'parts' || role === 'sponsor'
    ? role
    : 'player';

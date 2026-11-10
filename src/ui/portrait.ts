import { drawPortrait, type Look, PORTRAIT, styleForRole } from '../game/art/people.ts';
import { makeCanvas } from '../game/art/pixel.ts';

const cache = new Map<string, string>();

/** Data URL of a character's generated portrait. */
export function portraitUrl(id: string, look: Look, role: string, bg: string): string {
  let url = cache.get(id);
  if (!url) {
    const { canvas, ctx } = makeCanvas(PORTRAIT, PORTRAIT);
    drawPortrait(ctx, look, styleForRole(role), bg);
    url = canvas.toDataURL();
    cache.set(id, url);
  }
  return url;
}

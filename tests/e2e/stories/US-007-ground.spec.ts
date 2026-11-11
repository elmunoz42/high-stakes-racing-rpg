import { expect, test } from '../fixtures.ts';

/**
 * Guards the horizon. Far ground strips are one pixel tall; if the renderer
 * drops or mangles them, whatever lies behind shows through as flickering bands
 * under the skyline. This reads the pixels actually on screen and compares them
 * with the ground the race asked to be drawn.
 */
test.describe('US-007 Race against AI rivals', () => {
  test('US-007: the ground on screen matches the ground drawn, up to the skyline @US-007 @demo', async ({
    page,
    game,
  }) => {
    await game.start('fresh-career', 'Race', undefined, '/?seed=42');
    await expect
      .poll(async () => (await game.race<{ started: boolean }>()).started, { timeout: 8000 })
      .toBe(true);

    const result = await page.evaluate(async () => {
      interface Quad {
        x1: number;
        y1: number;
        w1: number;
        x2: number;
        y2: number;
        w2: number;
        color: number;
      }
      interface Sprite {
        x: number;
        y: number;
        w: number;
        h: number;
      }
      interface List {
        quads: Quad[];
        sprites: Sprite[];
      }
      const hooks = window.__game!;
      const race = hooks.race as {
        autopilot(on: boolean): void;
        drawList(): List | null;
      };
      const g = hooks.game!;
      const gl = (g.renderer as unknown as { gl: WebGLRenderingContext }).gl;
      const W = gl.drawingBufferWidth;
      const H = gl.drawingBufferHeight;
      const cam = g.scene.getScene('Race').cameras.main;
      const COLUMNS = [6, 40, 90, 140, 245, 300, 345, 378];
      const TOP = 86;
      const BOTTOM = 132;
      const colourAt = (l: List, x: number, y: number) => {
        let c = -1;
        for (const q of l.quads)
          if (y < q.y1 && y >= q.y2) {
            const t = (q.y1 - y) / (q.y1 - q.y2);
            const cx = q.x1 + (q.x2 - q.x1) * t;
            const w = q.w1 + (q.w2 - q.w1) * t;
            if (x >= cx - w && x <= cx + w) c = q.color;
          }
        return c;
      };
      let checked = 0;
      let wrong = 0;
      let frames = 0;
      const onFrame = () => {
        const l = race.drawList();
        // Skip frames where the camera is shaking: the picture is offset.
        if (!l || cam.scrollX !== 0 || cam.scrollY !== 0) return;
        frames += 1;
        const buf = new Uint8Array(W * (BOTTOM - TOP) * 4);
        gl.readPixels(0, H - BOTTOM, W, BOTTOM - TOP, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        for (const x of COLUMNS)
          for (let y = TOP; y < BOTTOM; y++) {
            // Scenery and cars are drawn over the ground; leave those pixels out.
            const covered = l.sprites.some(
              (s) =>
                x >= s.x - s.w / 2 - 3 &&
                x <= s.x + s.w / 2 + 3 &&
                y >= s.y - s.h - 3 &&
                y <= s.y + 3,
            );
            if (covered || colourAt(l, x + 0.5, y + 0.5) < 0) continue;
            const o = ((BOTTOM - 1 - y) * W + x) * 4;
            const got = (buf[o]! << 16) | (buf[o + 1]! << 8) | buf[o + 2]!;
            // Allow the neighbouring pixel's colour: edges may land a pixel either way.
            const ok = [
              [0.5, 0.5],
              [0.5, -0.5],
              [0.5, 1.5],
              [-0.5, 0.5],
              [1.5, 0.5],
            ].some(([dx, dy]) => colourAt(l, x + dx!, y + dy!) === got);
            checked += 1;
            if (!ok) wrong += 1;
          }
      };
      race.autopilot(true);
      g.events.on('postrender', onFrame);
      await new Promise((res) => setTimeout(res, 6000));
      g.events.off('postrender', onFrame);
      return { frames, checked, wrong };
    });

    expect(result.frames).toBeGreaterThan(60);
    expect(result.checked).toBeGreaterThan(10_000);
    // Dust, smoke and speed lines cross a few pixels; dropped strips cross thousands.
    expect(result.wrong / result.checked).toBeLessThan(0.01);
    await game.shot('US-007-AC6');
  });
});

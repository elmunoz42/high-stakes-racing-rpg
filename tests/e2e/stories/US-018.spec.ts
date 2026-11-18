import { expect, test } from '../fixtures.ts';
import type { Page } from '@playwright/test';

/**
 * A scripted controller stands in for real hardware: navigator.getGamepads
 * returns one pad in the standard mapping, which the test moves.
 */
async function plugInPad(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    }));
    const pad = {
      id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
      index: 0,
      connected: true,
      mapping: 'standard',
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons,
    };
    (window as unknown as { __pad: typeof pad }).__pad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null] });
  });
}

type PadState = { axes?: number[]; buttons?: Record<number, number> };
async function setPad(page: Page, s: PadState): Promise<void> {
  await page.evaluate((st) => {
    const pad = (
      window as unknown as {
        __pad: { axes: number[]; buttons: { pressed: boolean; value: number }[] };
      }
    ).__pad;
    pad.axes = st.axes ?? [0, 0, 0, 0];
    pad.buttons.forEach((b, i) => {
      const v = st.buttons?.[i] ?? 0;
      b.value = v;
      b.pressed = v > 0.5;
    });
  }, s);
}
/** Press and release a button, a few frames each. */
async function tap(page: Page, button: number): Promise<void> {
  await setPad(page, { buttons: { [button]: 1 } });
  await page.waitForTimeout(120);
  await setPad(page, {});
  await page.waitForTimeout(120);
}

const A = 0;
const B = 1;
const RT = 7;
const DOWN = 13;

test.describe('US-018 Play with a gamepad', () => {
  test('US-018: menus, town and a race on a controller @US-018 @demo', async ({ page, game }) => {
    await plugInPad(page);

    // AC1: on the title menu, D-pad moves focus and A presses.
    await game.start('fresh-career', 'Title');
    await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
    await setPad(page, { buttons: { [DOWN]: 1 } });
    await page.waitForTimeout(150);
    await setPad(page, {});
    await expect(page.getByRole('button', { name: 'New career' })).toBeFocused();
    // AC5: the hints now show controller buttons.
    await expect(page.locator('body')).toHaveClass(/pad/);
    await tap(page, B); // back out of nothing: still on the title
    await expect.poll(() => page.evaluate(() => window.__game!.scene())).toBe('Title');
    await game.shot('US-018-AC1');

    // AC2: walk the street with the stick, A at the garage door, B to leave.
    await game.goto('Town');
    const x0 = (await game.town<{ playerX: number }>()).playerX;
    await setPad(page, { axes: [1, 0, 0, 0] });
    await expect
      .poll(async () => (await game.town<{ playerX: number }>()).playerX)
      .toBeGreaterThan(x0 + 20);
    await setPad(page, {});
    await expect(page.getByText('◀ ▶ walk · A interact · B leave')).toBeVisible();
    await game.setPlayerX(170);
    await expect(page.getByTestId('interact-prompt')).toHaveText("Press E to enter Teo's Garage");
    await tap(page, A);
    await expect.poll(() => page.evaluate(() => window.__game!.scene())).toBe('Interior');
    await game.shot('US-018-AC2');
    await tap(page, B);
    await expect.poll(() => page.evaluate(() => window.__game!.scene())).toBe('Town');

    // AC3: a race on the right trigger and the stick.
    await game.goto('Race');
    await expect
      .poll(async () => (await game.race<{ started: boolean }>()).started, { timeout: 8000 })
      .toBe(true);
    await setPad(page, { buttons: { [RT]: 1 } });
    await expect
      .poll(async () => (await game.race<{ speedKmh: number }>()).speedKmh)
      .toBeGreaterThan(40);
    const xs = (await game.race<{ x: number }>()).x;
    await setPad(page, { buttons: { [RT]: 1 }, axes: [0.8, 0, 0, 0] });
    await expect.poll(async () => (await game.race<{ x: number }>()).x).toBeGreaterThan(xs + 0.5);
    await expect(
      page.getByText('RT gas · LT brake · stick steer · B handbrake · Y nitrous'),
    ).toBeVisible();
    await game.shot('US-018-AC3');
    await setPad(page, {});
  });
});

import { expect, test } from '../fixtures.ts';

interface Race {
  started: boolean;
  speedKmh: number;
  slide: number;
  smoke: number;
}

test.describe("US-010 Feel the car's limits", () => {
  test('US-010: handbrake with steering slides the car, makes smoke and costs speed @US-010 @demo', async ({
    page,
    game,
  }) => {
    await game.start('fresh-career', 'Race', undefined, '/?seed=42');
    await expect.poll(async () => (await game.race<Race>()).started, { timeout: 8000 }).toBe(true);

    // Get up to speed.
    await page.keyboard.down('ArrowUp');
    await expect
      .poll(async () => (await game.race<Race>()).speedKmh, { timeout: 15000 })
      .toBeGreaterThan(70);
    await page.keyboard.up('ArrowUp');
    const before = (await game.race<Race>()).speedKmh;
    expect((await game.race<Race>()).slide).toBeLessThan(0.1);

    // AC1: handbrake while steering.
    await page.keyboard.down('Space');
    await page.keyboard.down('ArrowLeft');
    await expect.poll(async () => (await game.race<Race>()).slide).toBeGreaterThan(0.6);
    await expect.poll(async () => (await game.race<Race>()).smoke).toBeGreaterThan(0);
    await game.shot('US-010-AC1');
    await expect.poll(async () => (await game.race<Race>()).speedKmh).toBeLessThan(before - 10);
    await page.keyboard.up('Space');
    await page.keyboard.up('ArrowLeft');
  });
});

import { expect, test } from '../fixtures.ts';

test.describe('US-007 Race against AI rivals', () => {
  test('US-007: countdown, drive with the HUD, finish and see the order @US-007 @demo', async ({
    page,
    game,
  }) => {
    await game.start('fresh-career', 'Town', undefined, '/?seed=42');

    // AC1: at the start gate, choose to race; countdown; me plus five rivals.
    await game.setPlayerX(1470);
    await expect(page.getByTestId('interact-prompt')).toHaveText(
      'Press E to race the Harbour Loop',
    );
    await game.press('e');
    await expect(page.getByTestId('race-hud')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /^[123]$/ })).toBeVisible();
    expect((await game.race<{ cars: number }>()).cars).toBe(6);
    await game.shot('US-007-AC1');

    // AC2: accelerate and steer; speed rises, car moves across the road, HUD shows lap and position.
    await expect
      .poll(async () => (await game.race<{ started: boolean }>()).started, { timeout: 8000 })
      .toBe(true);
    await page.keyboard.down('ArrowUp');
    await expect(page.getByLabel('Speed')).not.toHaveText('0 km/h');
    const x0 = (await game.race<{ x: number }>()).x;
    await page.keyboard.down('ArrowRight');
    await expect.poll(async () => (await game.race<{ x: number }>()).x).toBeGreaterThan(x0 + 0.5);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowUp');
    await expect(page.getByLabel('Lap')).toHaveText('Lap 1/3');
    await expect(page.getByLabel('Position')).toHaveText(/^P[1-6]\/6$/);
    await game.shot('US-007-AC2');

    // AC3: completing the race shows the finishing order with my position and time.
    await game.fastForward(3);
    const results = page.getByRole('dialog', { name: 'Race results' });
    await expect(results.getByRole('heading')).toHaveText('You finished P3');
    await expect(
      results.getByRole('table', { name: 'Finishing order' }).getByRole('row'),
    ).toHaveCount(7);
    await expect(results.getByRole('row', { name: /You/ })).toContainText('3');
    await game.shot('US-007-AC3');
  });
});

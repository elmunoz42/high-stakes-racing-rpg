import { expect, test } from '../fixtures.ts';

test.describe('US-017 Hear the racers during a race', () => {
  test('US-017: a rival who passes me says one of their own lines @US-017 @demo', async ({
    page,
    game,
  }) => {
    await game.start('fresh-career', 'Race', undefined, '/?seed=42');
    await expect
      .poll(async () => (await game.race<{ started: boolean }>()).started, { timeout: 8000 })
      .toBe(true);

    // AC1: sit still on the grid; the car behind (Dmitri) drives past and says so.
    const bubble = page.getByTestId('race-line');
    await expect(bubble).toBeVisible({ timeout: 15000 });
    await expect(bubble).toContainText('Dmitri');
    await expect(bubble).toContainText('Sideways AND in front. Believe!');
    await game.shot('US-017-AC1');
  });
});

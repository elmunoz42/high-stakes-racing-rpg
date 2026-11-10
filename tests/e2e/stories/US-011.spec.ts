import { expect, test } from '../fixtures.ts';

test.describe('US-011 Read the race from the HUD', () => {
  test('US-011: the HUD shows the gear going up and everyone on the lap strip @US-011 @demo', async ({
    page,
    game,
  }) => {
    await game.start('fresh-career', 'Race', undefined, '/?seed=42');
    const hud = page.getByTestId('race-hud');

    // AC2: a marker for me and each rival.
    await expect(
      hud.getByRole('img', { name: 'Field map' }).getByTestId('progress-marker'),
    ).toHaveCount(6);

    // AC1: gear shown, and it goes up as I gain speed.
    await expect(hud.getByLabel('Gear')).toHaveText('1');
    await expect
      .poll(async () => (await game.race<{ started: boolean }>()).started, { timeout: 8000 })
      .toBe(true);
    await page.keyboard.down('ArrowUp');
    await expect(hud.getByLabel('Gear')).toHaveText('2', { timeout: 15000 });
    await expect(hud.getByLabel('Gear')).toHaveText('3', { timeout: 15000 });
    await page.keyboard.up('ArrowUp');
    await game.shot('US-011-AC1');
  });
});

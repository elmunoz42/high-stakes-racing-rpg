import { expect, test } from '../fixtures.ts';

interface Race {
  started: boolean;
  speedKmh: number;
  nitroShots: number;
  boosting: boolean;
}

test.describe('US-014 Buy and use nitrous', () => {
  test('US-014: buy a shot at the counter, fire it in a race, and it is gone afterwards @US-014 @demo', async ({
    page,
    game,
  }) => {
    await game.start(
      'has-money',
      'Interior',
      { buildingId: 'varga-parts', talk: true },
      '/?seed=42',
    );

    // AC1: buy a shot; money drops; count goes up.
    const nitrous = game.dialogue().getByRole('group', { name: 'Nitrous' });
    await expect(nitrous.getByTestId('nitrous-count')).toHaveText('0 of 3');
    await nitrous.getByRole('button', { name: 'Buy a shot' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(nitrous.getByTestId('nitrous-count')).toHaveText('1 of 3');
    await expect(page.getByTestId('money')).toHaveText('$8,820');
    await game.shot('US-014-AC1');

    // AC2: in a race, the nitrous key uses a shot and boosts the car.
    await game.goto('Race');
    const shots = page.getByTestId('race-hud').getByLabel('Nitrous shots');
    await expect(shots).toHaveText('1');
    await expect.poll(async () => (await game.race<Race>()).started, { timeout: 8000 }).toBe(true);
    await page.keyboard.down('ArrowUp');
    await expect
      .poll(async () => (await game.race<Race>()).speedKmh, { timeout: 15000 })
      .toBeGreaterThan(40);
    await page.keyboard.down('n');
    await expect(shots).toHaveText('0');
    expect((await game.race<Race>()).boosting).toBe(true);
    await game.shot('US-014-AC2');
    await page.keyboard.up('n');
    await page.keyboard.up('ArrowUp');

    // AC3: the shot is gone from the career after the race.
    await game.fastForward(3);
    await expect(page.getByRole('dialog', { name: 'Race results' })).toBeVisible();
    expect((await game.state<{ nitrous: number }>()).nitrous).toBe(0);
  });
});

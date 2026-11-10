import { expect, test } from '../fixtures.ts';

test.describe('US-016 Race a rival one on one at night for money', () => {
  test('US-016: wager, night duel with two cars, win the money @US-016 @demo', async ({
    page,
    game,
  }) => {
    await game.start(
      'has-money',
      'Interior',
      { buildingId: 'bar', talk: 'nyx-calloway' },
      '/?seed=42',
    );
    const d = game.dialogue();
    await expect(d.getByTestId('duel-record')).toContainText('0 won, 0 lost');

    // AC1: pick a wager and confirm; a night race starts with just the two of us.
    await d
      .getByRole('group', { name: 'Wager' })
      .getByRole('button', { name: '$500', exact: true })
      .click();
    await expect(page.getByRole('alertdialog')).toContainText(
      'Race Nyx Calloway tonight for $500?',
    );
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('race-hud')).toBeVisible();
    expect(await game.race<{ duel: boolean; cars: number }>()).toMatchObject({
      duel: true,
      cars: 2,
    });
    await expect(page.getByTestId('race-hud').getByLabel('Position')).toHaveText(/^P[12]\/2$/);
    await game.shot('US-016-AC1');

    // AC2: win; the result names them, money goes up by the wager, the record shows it.
    await game.fastForward(1);
    const result = page.getByRole('dialog', { name: 'Duel result' });
    await expect(result.getByRole('heading')).toHaveText('You beat Nyx Calloway!');
    await expect(result.getByTestId('duel-money')).toHaveText('+$500');
    await expect(result.getByTestId('balance')).toHaveText('$9,500');
    await expect(result.getByTestId('duel-record')).toHaveText('1 won, 0 lost');
    await game.shot('US-016-AC2');
  });

  test('US-016: lose a duel and pay the wager @US-016 @demo', async ({ page, game }) => {
    await game.start(
      'has-money',
      'Interior',
      { buildingId: 'bar', talk: 'kenji-morrow' },
      '/?seed=42',
    );
    // Agree the race in conversation this time.
    await game.say('Race me tonight. One on one, $250.');
    await expect(page.getByRole('alertdialog')).toContainText(
      'Race Kenji "Static" Morrow tonight for $250?',
    );
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('race-hud')).toBeVisible();

    // AC3: lose; money goes down by the wager.
    await game.fastForward(2);
    const result = page.getByRole('dialog', { name: 'Duel result' });
    await expect(result.getByRole('heading')).toHaveText('Kenji "Static" Morrow beat you');
    await expect(result.getByTestId('duel-money')).toHaveText('-$250');
    await expect(result.getByTestId('balance')).toHaveText('$8,750');
    await game.shot('US-016-AC3');
  });
});

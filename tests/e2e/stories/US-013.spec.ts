import { expect, test } from '../fixtures.ts';

test.describe('US-013 Trade up to a faster car', () => {
  test('US-013: see the lot with my trade-in, buy the Mustang @US-013 @demo', async ({
    page,
    game,
  }) => {
    await game.start('rich-at-dustbowl', 'Interior', { buildingId: 'zamoras-lot', talk: true });
    const d = game.dialogue();
    await expect(d.getByRole('heading', { name: 'Lupe Zamora' })).toBeVisible();

    // AC1: real cars with power, weight, price, trade-in and what I would pay.
    const lot = d.getByLabel('Cars for sale');
    const mustang = lot.getByRole('group', { name: '1988 Ford Mustang GT' });
    await expect(mustang).toContainText('225 hp');
    await expect(mustang).toContainText('1,448 kg');
    await expect(mustang).toContainText('$21,371');
    await expect(d.getByTestId('trade-in')).toContainText('$7,672');
    await expect(mustang.getByTestId('you-pay')).toHaveText('You pay $13,699 after trade-in');
    await expect(lot.getByRole('group', { name: '1994 Dodge Viper RT/10' })).toContainText(
      '400 hp',
    );
    await game.shot('US-013-AC1');

    // AC2: choose and confirm; it becomes my car and I pay price less trade-in.
    await mustang.getByRole('button', { name: 'Buy' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('my-car')).toHaveText('1988 Ford Mustang GT');
    await expect(page.getByTestId('money')).toHaveText('$26,301');
    expect((await game.state<{ installed: object }>()).installed).toEqual({});
    await game.shot('US-013-AC2');
  });
});

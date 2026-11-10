import { expect, test } from '../fixtures.ts';

test.describe('US-009 Save and resume a career', () => {
  test('US-009: reload, Continue, same car, parts, money and sponsor @US-009 @demo', async ({
    page,
    game,
  }) => {
    await game.start('has-sponsor-deal', 'Town');
    await expect(page.getByTestId('money')).toHaveText('$5,000');
    const before = await game.state();

    await page.reload();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByTestId('place')).toHaveText('Harbour District');
    await expect(page.getByTestId('my-car')).toHaveText('1994 Mazda MX-5 Miata');
    await expect(page.getByTestId('money')).toHaveText('$5,000');
    await expect(page.getByTestId('my-sponsor')).toHaveText('VOLTKAT (3 races left)');
    expect(await game.state()).toEqual(before);
    await game.shot('US-009-AC1');
  });
});

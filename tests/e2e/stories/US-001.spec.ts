import { expect, test } from '../fixtures.ts';

test.describe('US-001 Start a career and pick a starter car', () => {
  test('US-001: new career, pick a real starter car, arrive in town with it @US-001 @demo', async ({
    page,
    game,
  }) => {
    await game.boot();
    await page.getByRole('button', { name: 'New career' }).click();

    // AC1: three real starter cars with make, model, year, power, weight and price.
    const cards = page
      .getByRole('dialog', { name: 'Choose your starter car' })
      .locator('[data-car-id]');
    await expect(cards).toHaveCount(3);
    for (const name of ['1994 Mazda MX-5 Miata', '1991 Volkswagen GTI 16V', '1991 Nissan 240SX']) {
      const card = page.getByRole('button', { name: new RegExp(name) });
      await expect(card).toContainText('hp');
      await expect(card).toContainText('kg');
      await expect(card).toContainText('$');
    }
    await expect(page.getByRole('button', { name: /1994 Mazda MX-5 Miata/ })).toContainText(
      '$10,960',
    );
    await game.shot('US-001-AC1');

    // AC2: pick and confirm, arrive in town with that car and starting money.
    await page.getByRole('button', { name: /1994 Mazda MX-5 Miata/ }).click();
    await page.getByRole('button', { name: 'Buy the Mazda MX-5 Miata and start' }).click();
    await expect(page.getByTestId('place')).toHaveText('Harbour District');
    await expect(page.getByTestId('my-car')).toHaveText('1994 Mazda MX-5 Miata');
    await expect(page.getByTestId('money')).toHaveText('$7,540');
    await game.shot('US-001-AC2');
  });
});

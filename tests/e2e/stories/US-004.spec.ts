import { expect, test } from '../fixtures.ts';

test.describe('US-004 Buy a real part from the parts seller', () => {
  test('US-004: browse real parts, haggle, buy at the haggled price @US-004 @demo', async ({
    page,
    game,
  }) => {
    await game.start('has-money', 'Interior', { buildingId: 'varga-parts', talk: true });
    const d = game.dialogue();
    const shop = d.getByLabel('Catalogue');

    // AC1: real parts that fit, with brand, name, part number, price and check date.
    const pads = shop.getByRole('group', { name: 'Hawk Performance HPS Street Front Brake Pads' });
    await expect(pads).toContainText('HB149F.505');
    await expect(pads).toContainText('$138.59');
    await expect(pads).toContainText('price checked 2026-11-09');
    await expect(shop.getByText('HB235F.665')).toHaveCount(0); // a 240SX part
    await game.shot('US-004-AC1');

    // AC3: ask for a better price; she agrees to a discount; the offered price is lower.
    await game.say('Can you do me a better price on the Blox coilovers?');
    await game.say('Come on, a better price, please?');
    const coilovers = shop.getByRole('group', { name: /Blox Racing Street Series II Coilovers/ });
    await expect(coilovers.getByTestId('price')).toContainText('$640.80');
    await game.shot('US-004-AC3');

    // AC2: choose it and confirm; money drops by that price; it is owned, not fitted.
    await coilovers.getByRole('button', { name: 'Buy' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('for $640.80?');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('money')).toHaveText('$8,359.20');
    await expect(coilovers.getByRole('button', { name: 'Owned' })).toBeDisabled();
    const s = await game.state<{ inventory: string[]; installed: object }>();
    expect(s.inventory).toEqual(['blox-ss2-bxss-02905']);
    expect(s.installed).toEqual({});
    await game.shot('US-004-AC2');
  });
});

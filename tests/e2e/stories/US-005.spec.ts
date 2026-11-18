import { expect, test } from '../fixtures.ts';

test.describe('US-005 Have the mechanic install a part', () => {
  test('US-005: ask Teo to fit owned tyres, confirm labour, see before and after stats @US-005 @demo', async ({
    page,
    game,
  }) => {
    await game.start('has-uninstalled-part', 'Interior', { buildingId: 'teos-garage', talk: true });
    const d = game.dialogue();

    // AC1: ask the mechanic to fit it and confirm the labour cost.
    await game.say('Can you fit my new parts?');
    await expect(page.getByRole('alertdialog')).toContainText('labour $80');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(d.getByText(/Fitted: Michelin Pilot Exalto PE2/)).toBeVisible();
    expect((await game.state<{ installed: Record<string, string> }>()).installed).toEqual({
      tyres: 'michelin-pe2-185-60r14',
    });
    await game.shot('US-005-AC1');

    // AC2: the car sheet shows the changed stats with before and after values.
    const sheet = d.getByTestId('stats-before-after');
    await expect(sheet.getByRole('row', { name: /Grip/ })).toContainText('1.00');
    await expect(sheet.getByRole('row', { name: /Grip/ })).toContainText('1.10');
    await expect(sheet.getByRole('row', { name: /Braking/ })).toContainText('1.05');
    await game.shot('US-005-AC2');
  });
});

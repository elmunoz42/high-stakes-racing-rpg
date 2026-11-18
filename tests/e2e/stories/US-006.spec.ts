import { expect, test } from '../fixtures.ts';

test.describe('US-006 Negotiate a sponsorship deal', () => {
  test('US-006: the sponsor offers a deal, I see the terms, I accept @US-006 @demo', async ({
    page,
    game,
  }) => {
    await game.start('fresh-career', 'Interior', { buildingId: 'brass-gull', talk: true });

    // AC1: the offer shows objective and payout before accepting.
    await game.say('Do you want to sponsor me?');
    const offer = page.getByRole('group', { name: 'Sponsorship offer' });
    await expect(offer.getByTestId('deal-objective')).toHaveText('Finish in the top 3');
    await expect(offer.getByTestId('deal-payout')).toHaveText('$600 per race');
    await game.shot('US-006-AC1');

    // AC2: accepting makes it my active sponsor with its objective.
    await offer.getByRole('button', { name: 'Accept deal' }).click();
    await expect(page.getByTestId('active-deal')).toContainText('Finish in the top 3');
    await expect(page.getByTestId('my-sponsor')).toHaveText('VOLTKAT (3 races left)');
    await game.shot('US-006-AC2');
  });
});

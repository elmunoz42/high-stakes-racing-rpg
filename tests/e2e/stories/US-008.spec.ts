import { expect, test } from '../fixtures.ts';

test.describe('US-008 Collect prize money and sponsor payout', () => {
  test('US-008: prize and sponsor payout on the results, then the coach talks about it @US-008 @demo', async ({
    page,
    game,
  }) => {
    await game.start('has-sponsor-deal', 'Race', undefined, '/?seed=42');
    await expect(page.getByTestId('race-hud')).toBeVisible();
    await game.fastForward(2);

    // AC1 + AC2: prize money for P2, the sponsor payout for a top-3 finish, new balance.
    const results = page.getByRole('dialog', { name: 'Race results' });
    await expect(results.getByTestId('prize')).toHaveText('$1,500');
    await expect(results.getByTestId('sponsor-payout')).toHaveText('$800');
    await expect(results.getByTestId('balance')).toHaveText('$7,300');
    await game.shot('US-008-AC1');

    // AC3: back in town, the coach refers to my finishing position.
    await results.getByRole('button', { name: 'Back to town' }).click();
    await expect(page.getByTestId('money')).toHaveText('$7,300');
    await game.setPlayerX(990);
    await game.press('e');
    await game.setPlayerX(262);
    await game.press('e');
    await expect(game.dialogue().getByRole('log').locator('[data-who=npc]').first()).toContainText(
      'P2',
    );
    await game.shot('US-008-AC3');
  });
});

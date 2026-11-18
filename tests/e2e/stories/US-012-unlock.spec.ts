import { expect, test } from '../fixtures.ts';

test.describe('US-012 Travel to a new race location', () => {
  test('US-012: a first podium says Pinewood is open and points to the travel board @US-012 @demo', async ({
    page,
    game,
  }) => {
    await game.start('fresh-career', 'Race', undefined, '/?seed=42');
    await expect
      .poll(async () => (await game.race<{ started: boolean }>()).started, { timeout: 8000 })
      .toBe(true);

    // AC6: the results say the next location is open and where to go.
    await game.fastForward(2);
    const results = page.getByRole('dialog', { name: 'Race results' });
    await expect(results.getByTestId('unlock-notice')).toContainText('Pinewood is open!');
    await expect(results.getByTestId('unlock-notice')).toContainText('Travel board');
    await game.shot('US-012-AC6-results');

    // Back in town, a pointer shows the way until I reach the board.
    await results.getByRole('button', { name: 'Back to town' }).click();
    const hint = page.getByTestId('travel-hint');
    await expect(hint).toHaveText('← Travel board: Pinewood is open');
    await game.shot('US-012-AC6-town');
    await game.setPlayerX(30);
    await expect(page.getByTestId('interact-prompt')).toHaveText('Press E to open the world map');
    await expect(hint).toBeHidden();
  });
});

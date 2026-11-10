import { expect, test } from '../fixtures.ts';

test.describe('US-012 Travel to a new race location', () => {
  test('US-012: read the travel board, travel to Pinewood, race its own track for a bigger prize @US-012 @demo', async ({
    page,
    game,
  }) => {
    await game.start('podium-at-harbour', 'Town', undefined, '/?seed=42');

    // AC1: the travel board lists six locations with costs and locks.
    await game.setPlayerX(30);
    await expect(page.getByTestId('interact-prompt')).toHaveText(
      'Press E to read the travel board',
    );
    await game.press('e');
    const board = page.getByRole('dialog', { name: 'Travel board' });
    await expect(board.getByRole('group')).toHaveCount(6);
    await expect(board.getByRole('group', { name: 'Dustbowl' })).toContainText('Locked');
    await expect(
      board.getByRole('group', { name: 'Harbour District' }).getByRole('button'),
    ).toHaveText('You are here');
    await game.shot('US-012-AC1');

    // AC2: travel to an unlocked place; money drops; the gate names its own track.
    await board
      .getByRole('group', { name: 'Pinewood' })
      .getByRole('button', { name: 'Travel ($150)' })
      .click();
    await expect(page.getByTestId('place')).toHaveText('Pinewood');
    await expect(page.getByTestId('money')).toHaveText('$8,850');
    await game.setPlayerX(1400);
    await expect(page.getByTestId('interact-prompt')).toHaveText(
      'Press E to race the Pinewood Pass',
    );
    await game.shot('US-012-AC2');

    // AC3: the race is on that track and pays more than the first location.
    await game.press('e');
    await expect(page.getByTestId('race-hud')).toBeVisible();
    expect((await game.race<{ trackId: string }>()).trackId).toBe('pinewood-pass');
    await game.shot('US-012-AC3-race');
    await game.fastForward(1);
    const results = page.getByRole('dialog', { name: 'Race results' });
    await expect(results).toContainText('Pinewood Pass');
    await expect(results.getByTestId('prize')).toHaveText('$3,120');
    await game.shot('US-012-AC3');
  });
});

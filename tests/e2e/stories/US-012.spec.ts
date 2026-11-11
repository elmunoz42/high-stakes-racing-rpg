import { expect, test } from '../fixtures.ts';

test.describe('US-012 Travel to a new race location', () => {
  test('US-012: open the world map, drive to Pinewood, race its own track for a bigger prize @US-012 @demo', async ({
    page,
    game,
  }) => {
    await game.start('podium-at-harbour', 'Town', undefined, '/?seed=42');

    // AC1: the travel board opens the world map: six places, which are locked, where I am.
    await game.setPlayerX(30);
    await expect(page.getByTestId('interact-prompt')).toHaveText('Press E to open the world map');
    await game.press('e');
    const card = page.getByRole('dialog', { name: 'Travel map' });
    await expect(card).toContainText('Harbour District');
    await expect(card.getByRole('button')).toHaveText('You are here');
    const map = await page.evaluate(
      () =>
        (
          window.__game!.map as { snapshot(): { places: { id: string; status: string }[] } }
        ).snapshot().places,
    );
    expect(map).toHaveLength(6);
    expect(map.find((p) => p.id === 'harbour-district')?.status).toBe('here');
    expect(map.find((p) => p.id === 'pinewood')?.status).toBe('open');
    expect(map.find((p) => p.id === 'dustbowl')?.status).toBe('locked');
    await game.shot('US-012-AC1');

    // AC2: pick an unlocked place and travel; my car drives there; money drops; the gate names its own track.
    await game.press('ArrowRight');
    await expect(card).toContainText('Pinewood');
    await expect(card.getByRole('button')).toHaveText('Travel ($150)');
    await game.press('Enter');
    await expect(page.getByTestId('place')).toHaveText('Pinewood', { timeout: 8000 });
    await expect(page.getByTestId('money')).toHaveText('$8,850');
    await game.setPlayerX(1640);
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

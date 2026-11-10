import { expect, test } from '../fixtures.ts';

test.describe('US-002 Walk the town and enter buildings', () => {
  test('US-002: walk the street, find every building, enter the garage @US-002 @demo', async ({
    page,
    game,
  }) => {
    await game.start('fresh-career', 'Town');
    await expect(page.getByTestId('place')).toHaveText('Harbour District');

    // AC1: holding right walks the player along the street.
    const startX = (await game.town<{ playerX: number }>()).playerX;
    await page.keyboard.down('ArrowRight');
    await expect
      .poll(async () => (await game.town<{ playerX: number }>()).playerX)
      .toBeGreaterThan(startX + 20);
    await page.keyboard.up('ArrowRight');
    await game.shot('US-002-AC1');

    // AC3: garage, parts shop, sponsor lounge, coach and start gate are on the street.
    const kinds = await page.evaluate(() =>
      (
        window.__game!.town as { buildings(): { kind: string; x: number; name: string }[] }
      ).buildings(),
    );
    expect(kinds.map((b) => b.kind).sort()).toEqual([
      'garage',
      'gate',
      'lounge',
      'shop',
      'trailer',
    ]);
    for (const b of kinds.filter((k) => k.kind !== 'garage')) {
      await game.setPlayerX(b.x);
      await expect(page.getByTestId('interact-prompt')).toContainText(
        b.kind === 'gate' ? 'race the Harbour Loop' : b.name,
      );
    }
    await game.shot('US-002-AC3');

    // AC2: at a door, interact goes inside and the character is there.
    await game.setPlayerX(170);
    await expect(page.getByTestId('interact-prompt')).toHaveText("Press E to enter Teo's Garage");
    await game.press('e');
    await expect(page.getByTestId('room-name')).toHaveText("Teo Baptista, Mechanic, Teo's Garage");
    expect(await game.town()).toMatchObject({ scene: 'interior', characterId: 'teo-baptista' });
    await game.shot('US-002-AC2');
  });
});

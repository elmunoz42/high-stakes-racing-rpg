import { expect, test } from '../fixtures.ts';

test.describe('US-015 Meet the racers at the bar', () => {
  test('US-015: walk into the bar, see six racers, talk to one @US-015 @demo', async ({
    page,
    game,
  }) => {
    await game.start('has-money', 'Town');

    // AC1: the bar is on the street; inside are all six racers by name.
    await game.setPlayerX(1250);
    await expect(page.getByTestId('interact-prompt')).toHaveText(
      'Press E to enter The Rusty Anchor',
    );
    await game.press('e');
    const room = page.getByTestId('room-name');
    for (const name of [
      'Kenji "Static" Morrow',
      'Priya Nandakumar',
      '"Big" Lou Ferreira',
      'Rosa "Ro" Esposito',
      'Dmitri Volk',
      'Nyx Calloway',
    ])
      await expect(room).toContainText(name);
    const npcs = (await game.town<{ npcs: { id: string; x: number }[] }>()).npcs;
    expect(npcs).toHaveLength(6);
    await game.shot('US-015-AC1');

    // AC2: walk up to one and talk; they answer in their own voice.
    await game.setPlayerX(npcs.find((n) => n.id === 'rosa-esposito')!.x);
    await expect(page.getByTestId('interact-prompt')).toHaveText(
      'Press E to talk to Rosa "Ro" Esposito',
    );
    await game.press('e');
    const d = game.dialogue();
    await expect(d.getByRole('heading', { name: 'Rosa "Ro" Esposito', exact: true })).toBeVisible();
    await expect(d.getByRole('img', { name: 'Portrait of Rosa "Ro" Esposito' })).toBeVisible();
    await expect(d.getByRole('log').locator('[data-who=npc]').first()).toContainText('hotshot');
    await game.say('Tell me about your car.');
    await expect(d.getByRole('log').locator('[data-who=npc]').last()).toContainText(
      'You do not need money to be fast',
    );
    await game.shot('US-015-AC2');
  });
});

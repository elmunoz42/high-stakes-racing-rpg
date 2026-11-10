import { expect, test } from '../fixtures.ts';

test.describe('US-003 Talk to a character in free text', () => {
  test('US-003: open a conversation, type, get a streamed in-voice reply about my car @US-003 @demo', async ({
    page,
    game,
  }) => {
    await game.start('fresh-career', 'Interior', { buildingId: 'team-trailer' });

    // AC1: next to the character, interact opens the panel with name, portrait and greeting.
    await game.setPlayerX(262);
    await expect(page.getByTestId('interact-prompt')).toHaveText('Press E to talk to Mags Okafor');
    await game.press('e');
    const d = game.dialogue();
    await expect(d.getByRole('heading', { name: 'Mags Okafor' })).toBeVisible();
    await expect(d.getByText('MO', { exact: true })).toBeVisible();
    await expect(d.getByRole('log').locator('[data-who=npc]').first()).toContainText('Rookie');
    await game.shot('US-003-AC1');

    // AC3: suggested lines are offered.
    await expect(d.getByLabel('Suggested lines').getByRole('button')).toHaveCount(3);

    // AC2 + AC4: type a message, the reply streams in and mentions the car I own.
    await game.say('What do you think of my car?');
    await expect(d.getByRole('log').locator('[data-who=player]').last()).toHaveText(
      'What do you think of my car?',
    );
    await expect(d.getByRole('log').locator('[data-who=npc]').last()).toContainText(
      '1994 Mazda MX-5 Miata',
    );
    await game.shot('US-003-AC4');
  });
});

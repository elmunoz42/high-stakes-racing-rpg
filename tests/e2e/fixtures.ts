import { readFileSync } from 'node:fs';
import { expect, type Page, test as base } from '@playwright/test';

/**
 * Story test helpers. Tests run against `npm run dev:mock` (scripted
 * characters), never the real model. Saves come from tests/fixtures/saves.
 */

export const test = base.extend<{ game: GameDriver }>({
  game: async ({ page }, use) => {
    const health = await page.request.get('/api/health');
    const body = (await health.json()) as { provider: string };
    if (body.provider !== 'mock')
      throw new Error(
        `Story tests need LLM_PROVIDER=mock; the API is running "${body.provider}". Stop npm run dev and use npm run dev:mock.`,
      );
    await use(new GameDriver(page));
  },
});
export { expect };

export class GameDriver {
  constructor(readonly page: Page) {}

  async boot(path = '/'): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForFunction(() => !!window.__game && window.__game.scene() !== 'Boot');
  }

  /** Loads a save fixture into a fresh page and opens a scene. */
  async start(fixture: string, scene: string, params?: object, path = '/'): Promise<void> {
    const save = JSON.parse(readFileSync(`tests/fixtures/saves/${fixture}.json`, 'utf8'));
    await this.boot(path);
    await this.page.evaluate(
      ([s, sc, p]) => {
        window.__game!.loadSave(s);
        window.__game!.goto(sc as never, p as object | undefined);
      },
      [save, scene, params] as const,
    );
  }

  state<T = Record<string, unknown>>(): Promise<T> {
    return this.page.evaluate(() => window.__game!.state() as never);
  }

  town<T = Record<string, unknown>>(): Promise<T> {
    return this.page.evaluate(
      () => (window.__game!.town as { snapshot(): unknown }).snapshot() as never,
    );
  }

  race<T = Record<string, unknown>>(): Promise<T> {
    return this.page.evaluate(
      () => (window.__game!.race as { snapshot(): unknown }).snapshot() as never,
    );
  }

  async setPlayerX(x: number): Promise<void> {
    await this.page.evaluate(
      (v) => (window.__game!.town as { setPlayerX(x: number): void }).setPlayerX(v),
      x,
    );
  }

  async fastForward(finishPosition: number): Promise<void> {
    await this.page.evaluate(
      (p) =>
        (window.__game!.race as { fastForward(o: { finishPosition: number }): void }).fastForward({
          finishPosition: p,
        }),
      finishPosition,
    );
  }

  /** Press a key the way a player does: down, a game frame or two, up. */
  async press(key: string): Promise<void> {
    await this.page.keyboard.down(key);
    await this.page.waitForFunction(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))),
    );
    await this.page.keyboard.up(key);
  }

  /** Saves evidence when STORY_RUN_DIR is set (verify-stories runs). */
  async shot(name: string): Promise<void> {
    const dir = process.env.STORY_RUN_DIR;
    if (dir) await this.page.screenshot({ path: `${dir}/screenshots/${name}.png` });
  }

  dialogue() {
    return this.page.getByRole('dialog', { name: /Talking to/ });
  }

  async say(text: string): Promise<void> {
    const box = this.dialogue().getByRole('textbox');
    await expect(this.dialogue().getByRole('button', { name: 'Send' })).toBeEnabled();
    await box.fill(text);
    await box.press('Enter');
    await expect(this.dialogue().getByRole('button', { name: 'Send' })).toBeEnabled();
  }
}

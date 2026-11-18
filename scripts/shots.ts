/**
 * Art review screenshots: the same views every time, for before/after
 * comparisons. Needs `npm run dev:mock` on WEB_PORT (default 5273).
 *   npx tsx scripts/shots.ts <out-dir>
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? 'shots';
const port = process.env.WEB_PORT ?? '5273';
mkdirSync(out, { recursive: true });
const save = (f: string) => JSON.parse(readFileSync(`tests/fixtures/saves/${f}.json`, 'utf8'));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const wait = (ms: number) => page.waitForTimeout(ms);
async function boot(fixture: string, scene: string, params?: object) {
  await page.goto(`http://localhost:${port}/?seed=42`);
  await page.waitForFunction(() => !!window.__game && window.__game.scene() !== 'Boot');
  await page.evaluate(
    ([s, sc, p]) => {
      window.__game!.loadSave(s);
      window.__game!.goto(sc as never, p as object | undefined);
    },
    [save(fixture), scene, params] as const,
  );
  await wait(700);
}
const raceAt = async (name: string, loc: string | undefined, secs: number[], duel?: string) => {
  const s = save('rich-at-dustbowl');
  s.location = loc ?? 'harbour-district';
  await page.goto(`http://localhost:${port}/?seed=42`);
  await page.waitForFunction(() => !!window.__game && window.__game.scene() !== 'Boot');
  await page.evaluate(
    ([sv, d]) => {
      window.__game!.loadSave(sv);
      window.__game!.goto('Race', d ? { duel: { rivalId: d, wagerUsd: 200 } } : undefined);
    },
    [s, duel] as const,
  );
  await page.waitForFunction(
    () =>
      (window.__game!.race as { snapshot(): { started: boolean } } | undefined)?.snapshot()
        .started === true,
    null,
    { timeout: 15000 },
  );
  await page.evaluate(() =>
    (window.__game!.race as { autopilot(on: boolean): void }).autopilot(true),
  );
  let t = 0;
  for (const s2 of secs) {
    await wait((s2 - t) * 1000);
    t = s2;
    await page.screenshot({ path: `${out}/race-${name}-${s2}s.png` });
  }
};

/** Drive by hand: full throttle, then a hard turn, with shots during the turn. */
async function turning(name: string, dir: 'ArrowRight' | 'ArrowLeft') {
  const s = save('rich-at-dustbowl');
  s.location = 'harbour-district';
  await page.goto(`http://localhost:${port}/?seed=42`);
  await page.waitForFunction(() => !!window.__game && window.__game.scene() !== 'Boot');
  await page.evaluate((sv) => {
    window.__game!.loadSave(sv);
    window.__game!.goto('Race');
  }, s);
  await page.waitForFunction(
    () =>
      (window.__game!.race as { snapshot(): { started: boolean } } | undefined)?.snapshot()
        .started === true,
    null,
    { timeout: 15000 },
  );
  await page.keyboard.down('ArrowUp');
  await wait(6000);
  await page.keyboard.down(dir);
  await wait(450);
  await page.screenshot({ path: `${out}/turn-${name}-a.png` });
  await wait(500);
  await page.screenshot({ path: `${out}/turn-${name}-b.png` });
  await page.keyboard.up(dir);
  await page.keyboard.up('ArrowUp');
}

const only = process.env.ONLY;
if (only === 'title') {
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => !!window.__game && window.__game.scene() === 'Title');
  await wait(1200);
  await page.screenshot({ path: `${out}/title.png` });
  await browser.close();
  console.log('saved to', out);
  process.exit(0);
}
if (only === 'turn') {
  await turning('right', 'ArrowRight');
  await turning('left', 'ArrowLeft');
  await browser.close();
  console.log('saved to', out);
  process.exit(0);
}

await boot('fresh-career', 'Town');
await page.screenshot({ path: `${out}/town-harbour.png` });
await page.evaluate(() => (window.__game!.town as { setPlayerX(x: number): void }).setPlayerX(900));
await wait(500);
await page.screenshot({ path: `${out}/town-harbour-mid.png` });
await boot('fresh-career', 'Interior', { buildingId: 'teos-garage' });
await page.screenshot({ path: `${out}/interior-garage.png` });
await boot('fresh-career', 'Interior', { buildingId: 'bar' });
await page.screenshot({ path: `${out}/interior-bar.png` });
await raceAt('harbour', undefined, [2, 9]);
await raceAt('pinewood', 'pinewood', [9]);
await raceAt('neon', 'neon-city', [9]);
await raceAt('duel', undefined, [8], 'nyx-calloway');
await browser.close();
console.log('saved to', out);

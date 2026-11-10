/**
 * Talk to a character from the terminal through the real dialogue engine.
 *
 *   npx tsx scripts/talk.ts <character-id> [--save tests/fixtures/saves/x.json] "line 1" "line 2" ...
 *
 * Uses LLM_PROVIDER from .env (openai by default). Prints the transcript and
 * every game action the character proposed, and whether the validator
 * accepted it. Accepted immediate actions (discounts, deal offers,
 * relationship) are applied to the working state between lines.
 */
import { existsSync, readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { runChat } from '../server/dialogue.ts';
import { providerFromEnv } from '../server/app.ts';
import { ARRIVAL_MESSAGE, type ChatEvent, type Turn } from '../shared/dialogue.ts';
import { CATALOGUE } from '../src/data/catalogue.ts';
import { applyAction } from '../src/rpg/actions.ts';
import { migrate } from '../src/save/migrations.ts';

if (existsSync('.env')) loadEnvFile('.env');

const args = process.argv.slice(2);
const characterId = args.shift();
let savePath = 'tests/fixtures/saves/fresh-career.json';
if (args[0] === '--save') {
  args.shift();
  savePath = args.shift() ?? savePath;
}
if (!characterId) {
  console.error('usage: npx tsx scripts/talk.ts <character-id> [--save file] "line" ...');
  process.exit(1);
}

let state = migrate(JSON.parse(readFileSync(savePath, 'utf8')));
const provider = providerFromEnv();
const history: Turn[] = [];
const name = CATALOGUE.characters.find((c) => c.id === characterId)?.name ?? characterId;
console.log(`# ${name} (${provider.name}), save ${savePath}\n`);

for (const line of [ARRIVAL_MESSAGE, ...args]) {
  if (line !== ARRIVAL_MESSAGE) console.log(`**Player:** ${line}`);
  let reply = '';
  const notes: string[] = [];
  const t0 = Date.now();
  const ctrl = new AbortController();
  await runChat(
    { characterId, message: line, history, state },
    provider,
    CATALOGUE,
    (e: ChatEvent) => {
      if (e.type === 'text') reply += e.delta;
      else if (e.type === 'applied') {
        const r = applyAction(state, e.action, CATALOGUE);
        if (r.ok) state = r.state;
        notes.push(`applied: ${e.label}`);
      } else if (e.type === 'proposal') notes.push(`proposal: ${e.label}`);
      else if (e.type === 'rejected') notes.push(`rejected ${e.tool}: ${e.reason}`);
      else if (e.type === 'tip') notes.push(`tip: ${e.topic}: ${e.tip}`);
      else if (e.type === 'quote') notes.push(`quote: ${e.partId}`);
      else if (e.type === 'error') notes.push(`ERROR: ${e.message} (fallback: ${e.fallback})`);
    },
    ctrl.signal,
  );
  console.log(`**${name}:** ${reply.trim()}`);
  for (const n of notes) console.log(`  _[${n}]_`);
  console.log(`  _(${((Date.now() - t0) / 1000).toFixed(1)} s)_\n`);
  history.push({ role: 'player', text: line }, { role: 'npc', text: reply.trim() });
}

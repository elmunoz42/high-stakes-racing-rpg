# Racing RPG (working title)

A browser game in two equal halves:

- **The race:** retro pseudo-3D street-car racing against five AI rivals on
  the Harbour Loop.
- **The paddock:** a side-scrolling waterfront town where your coach, your
  mechanic, the parts counter and a sponsor rep are characters driven by
  OpenAI GPT-6 Luna. You can haggle, get parts fitted, negotiate deals and
  get coached. What they say can change your career, but every change is
  validated by the game.

Real cars, real parts, real prices: the three starter cars and fourteen
aftermarket parts carry a source link and the date the price was checked.

## Run it

Requires Node 22.

```bash
npm install
```

With the real characters (needs an OpenAI API key in `.env`; a ChatGPT
subscription does not include API access):

```bash
cp .env.example .env   # then set OPENAI_API_KEY
npm run dev
```

With scripted characters (free, offline, what the tests use):

```bash
npm run dev:mock
```

Open http://localhost:5173. The API runs on port 8787 and Vite proxies
`/api` to it. Your career saves automatically in the browser.

## Controls

| Where | Keys |
|---|---|
| Town and interiors | ← → or A D to walk, E (or Enter, Space, ↑) to interact, Esc to leave a building |
| Conversations | Type and press Enter, or click a suggested line. Esc to leave |
| Race | ↑ or W accelerate, ↓ or S brake, ← → or A D steer, Space handbrake (slides the car) |

## Develop

```bash
npm run check          # typecheck, lint, unit tests
npm run test:e2e       # Playwright story tests (own mock servers on ports 5273/8887)
npx tsx scripts/talk.ts dee-dee-varga "Can you do me a better price?"   # talk to a character from the terminal
```

Where things live:

- `src/race/`: pure race engine (track, physics, AI, projection). No Phaser.
- `src/rpg/`: pure rules (actions reducer, economy, car stats).
- `src/data/`: cars, parts, characters, locations, rivals, with Zod schemas.
- `src/game/`: Phaser scenes. `src/ui/`: the HTML overlay.
- `server/`: Hono API, prompt builder, action validator, OpenAI and mock providers.
- `agent-os/`: product docs, standards, specs and user stories
  ([agent-os](https://github.com/elmunoz42/agent-os) harness).

Model settings live in `.env`: `NPC_MODEL` (default `gpt-6-luna`) and
`NPC_REASONING_EFFORT` (default `low`).

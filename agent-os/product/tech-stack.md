# Tech Stack

Decisions confirmed with the owner on 2026-11-09:
retro pseudo-3D racing, local-only LLM hosting for now, demo testing level.

## Frontend (the game)

- **TypeScript** (strict) everywhere.
- **Vite** for dev server and build. Dev server on port **5173**.
- **Phaser** (latest stable major; confirm the current version at install time
  and pin it) for scenes, input, audio, asset loading, tilemaps and the
  side-scroller physics.
- **Pseudo-3D road renderer written in-house** as a pure TypeScript module
  (segment projection, curves, hills, sprite scaling). It produces draw data;
  a thin Phaser scene draws it. No Three.js / real 3D in scope. The race engine
  sits behind an interface so a 3D renderer could replace it later without
  touching the RPG side.
- **Pixel art** at a fixed internal resolution (target 384x216, integer scaled).
  Placeholder art is acceptable until the art milestone; keep art swappable
  via an asset manifest.
- UI for dialogue, shop and garage: HTML/CSS overlay on top of the canvas
  (accessible text, easy text input for chat, testable with Playwright).

## Backend (dialogue proxy)

- **Node.js 22 + TypeScript**, a small **Hono** server (Express is acceptable if
  Hono causes friction). Port **8787**; Vite proxies `/api` to it in dev.
- **Anthropic TypeScript SDK** for character dialogue, with streaming (SSE to
  the browser) and tool use for game actions.
- Model IDs come from env, never hardcoded in game logic:
  `NPC_MODEL` (default `claude-haiku-5-5` for fast, cheap small talk) and
  `NPC_MODEL_KEY_SCENES` (default `claude-sonnet-5-5` for negotiations and story
  beats). Load the `claude-api` skill before writing any SDK code and confirm
  current model IDs, pricing and prompt-caching usage there.
- **Local only for now.** `ANTHROPIC_API_KEY` lives in `.env` (gitignored;
  `.env.example` committed). The key never reaches the browser. Public hosting,
  auth and rate limiting are deferred to the release milestone.
- **Mock LLM provider** (`LLM_PROVIDER=mock`) returning scripted, deterministic
  replies and tool calls. All automated tests and the default `npm run dev:mock`
  use it, so tests cost nothing and never flake on model output.

## Data and persistence

- **Save game:** versioned JSON in `localStorage` (schema validated with Zod,
  with a migration function per version). No accounts, no database.
- **Catalogue:** cars, parts, characters, locations and tracks are static,
  typed data files under `src/data/` validated by Zod at build and test time.
  See the `data/real-world-catalogue` standard for sourcing rules.
- Server is stateless; conversation history and NPC memory summaries are held
  in the save and sent with each request.

## Testing and tooling

- **Vitest** for unit tests (race physics, economy, action validation, save
  migrations, catalogue validation).
- **Playwright** for story tests under `tests/e2e/stories/`, tagged `@US-###`
  and `@demo`, run against the mock LLM provider.
- **ESLint + Prettier**. `npm run check` runs typecheck, lint and unit tests.
- **agent-os 3.1-fork** for product docs, standards, specs and user stories.
  Testing level: **demo**.
- **git**, `main` branch, one branch per spec, conventional commit messages.

## Layout (target)

```
src/
  game/        Phaser boot, scenes (Title, Garage, Town, Dialogue, Race, Results)
  race/        pure race engine: track, projection, physics, AI (no Phaser imports)
  rpg/         pure RPG rules: economy, inventory, sponsorship, relationships
  dialogue/    client for /api/chat, action handling, memory summaries
  data/        cars, parts, characters, locations, tracks + Zod schemas
  save/        save schema, migrations, storage
  ui/          HTML overlay components
server/        Hono app, LLM providers (anthropic, mock), prompt builder, action validator
shared/        types shared by client and server (actions, persona, game snapshot)
tests/e2e/stories/
```

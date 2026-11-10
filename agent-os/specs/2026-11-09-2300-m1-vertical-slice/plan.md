# M1 Vertical Slice — Plan

Goal: one location, one race, the whole loop playable end to end with
placeholder art: new career -> town -> talk, buy, install, get sponsored ->
race -> get paid -> back to town -> save.

Done means: stories US-001 to US-009 verified at demo level with
`/verify-stories spec:2026-11-09-2300-m1-vertical-slice`, `npm run check`
green, and a short real-model transcript for each of the four characters pasted
into `notes.md` in this folder.

Work on branch `m1-vertical-slice`. Commit after every task. Read
`agent-os/product/game-design.md` and the four standards before starting.

## Task 1: Save spec documentation (done)

This folder and stories US-001 to US-009 exist and are committed.

## Task 2: Scaffold

- `npm init`, Vite + TypeScript (strict), Phaser (check and pin the current
  stable version), Hono server in `server/`, shared types in `shared/`.
- Vitest, Playwright (Chromium only), ESLint, Prettier.
- Scripts: `dev` (Vite + API with real provider), `dev:mock` (both with
  `LLM_PROVIDER=mock`), `build`, `test` (Vitest), `test:e2e`, `check`.
- Vite proxies `/api` to `http://localhost:8787`.
- `.env.example` with `ANTHROPIC_API_KEY=`, `LLM_PROVIDER=anthropic`,
  `NPC_MODEL=`, `NPC_MODEL_KEY_SCENES=`.
- Folder layout from `agent-os/product/tech-stack.md`.
- Boot scene shows a title screen at 384x216 integer scaled, with an HTML
  overlay root.
- Confirm `agent-os/testing.yml` commands work (`npm run dev:mock`, port 5173).

## Task 3: Game state, save, test hooks

- `GameState` type and Zod schema (version 1): money, owned car, inventory,
  installed parts by slot, active sponsor deal, relationships, NPC memory
  summaries, last race result, current location.
- `applyAction(state, action)` reducer with typed errors.
- localStorage store with autosave on every accepted action; migration
  scaffold with a test for a fake v0 -> v1.
- `window.__game` hooks (dev/test only) per the testing standard.
- Save fixtures in `tests/fixtures/saves/`.
- Covers: US-009.

## Task 4: Catalogue data (sourced)

- Zod schemas for cars and parts per the catalogue standard.
- Research and enter **three starter cars** from the candidates in the game
  design doc, and **about twelve parts** (tyres, suspension, intake or exhaust,
  brake pads) that fit them. Every record needs `source_url` and `checked_on`.
  Look everything up; do not enter figures from memory. If a price cannot be
  sourced, choose a different part.
- Stat derivation rules in `src/rpg/carStats.ts` with unit tests.
- Catalogue validation unit test.
- Covers: US-001 AC3, US-004 AC5.

## Task 5: Race engine (pure)

- Track data format (segments with length, curve, hill; scenery; laps) and one
  original track, about 60 to 90 seconds a lap.
- Projection and draw-list builder for the pseudo-3D road.
- Fixed timestep physics: acceleration from power to weight, top speed from
  power and aero, cornering limit from grip (off-line drift outward on curves),
  braking, off-road slowdown, simple car to car collisions.
- Five AI rivals with pace factors and names; position and lap tracking.
- Seeded RNG; determinism and stat sensitivity unit tests.
- Covers: US-007 AC4, AC5.

## Task 6: Race scene

- Phaser scene that draws the draw list (road, scenery sprites, cars), a
  countdown, HUD in the HTML overlay (speed, lap, position), keyboard input.
- Results screen: order, time, prize money, sponsor payout, new balance.
- `fastForward` test hook.
- Covers: US-007, US-008 AC1, AC2, AC4.

## Task 7: Town scene

- Side-scrolling street with parallax, player walk animation (placeholder),
  five interactables: garage, parts shop, sponsor lounge, coach, start gate.
- Interior is a simple single-screen room per building with its character.
- Interact prompt; player position exposed through the test hook.
- New career flow: title -> starter car pick -> town.
- Covers: US-001, US-002.

## Task 8: Dialogue backend

- Load the `claude-api` skill first.
- `LlmProvider` interface; `anthropic` provider with streaming and tools;
  `mock` provider driven by per-character script files.
- Persona cards for Mags Okafor, Teo Baptista, Dee Dee Varga and Sterling
  Pruitt in `src/data/characters/`, expanded from the game design doc into
  full cards (voice, wants, opinions, secrets, running jokes, limits).
- Prompt builder (stable prefix first for caching) and unit tests.
- Tool definitions and server-side action validator with hard limits:
  `quote_part`, `offer_discount` (floor 15 percent), `sell_part`,
  `install_part` (fixed labour table), `offer_sponsorship` (payout range per
  sponsor), `give_tip`.
- `POST /api/chat` streaming endpoint; `POST /api/summarise` for memory.
- In-character fallback line on error or timeout.
- Covers: US-003 AC5, US-004 AC4, US-006 AC3.

## Task 9: Dialogue UI and RPG actions

- Dialogue overlay: portrait, name, streamed text, text input, suggested
  lines, close.
- Shop panel (catalogue filtered to the player's car, price and checked date,
  confirm purchase, shows haggled price when an offer is active).
- Garage panel (inventory, install with labour cost confirm, before and after
  stats).
- Sponsor offer card (objective, payout, accept or decline).
- Client re-validates every action before applying it to the save.
- Memory summary call when a conversation closes; coach references the last
  race result through the snapshot.
- Covers: US-003, US-004, US-005, US-006, US-008 AC3.

## Task 10: Tune and read

- Play the loop with the real provider. Tune starting money, prize table and
  part effects so the first purchase is a real decision and one upgrade is
  felt on track.
- Read conversations with all four characters. Tighten persona cards until
  each is recognisable from a single line. Paste short transcripts into
  `notes.md` here.
- Update `README.md` with how to run (real and mock) and controls.

## Final Task: Verify stories

Run `/verify-stories spec:2026-11-09-2300-m1-vertical-slice` at demo level:
walk each acceptance criterion in a real browser against `npm run dev:mock`,
harden passing checks into `tests/e2e/stories/US-00N.spec.ts` tagged `@demo`,
and report failures. Do not edit a story to match a bug.

## Out of scope for M1

Final art and audio, drifting model, multiple locations, buying or selling
cars, tuning, part wear, gamepad and touch, public hosting, accounts.

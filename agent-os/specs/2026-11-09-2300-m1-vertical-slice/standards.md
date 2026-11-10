# Standards for M1 Vertical Slice

The following standards apply to this work. Source files live in `agent-os/standards/`; this is a snapshot taken when the spec was shaped.

---

## game/architecture


- **Rules are pure, scenes are thin.** `src/race/` and `src/rpg/` contain no
  Phaser, DOM or network imports. Scenes read state, call rule functions and
  draw. If logic is hard to unit test, it is in the wrong place.
- **One game state object**, serialisable, owned by a store in `src/save/`.
  Scenes never keep career data in their own fields.
- **State changes go through actions** (`applyAction(state, action) -> state`)
  that validate first and return a typed error on failure. No direct mutation
  from UI or dialogue code.
- **Deterministic simulation.** Race physics runs on a fixed 60 Hz timestep
  with a seeded RNG passed in. No `Math.random()` or `Date.now()` in rules.
- **Content is data.** Cars, parts, characters, locations and tracks are typed
  data files validated by Zod. Adding a car or a character must not need a code
  change outside `src/data/`.
- **Race engine behind an interface** (`RaceEngine`, `RaceRenderer`) so the
  renderer can be replaced without touching rules or RPG code.
- **Assets via a manifest**, referenced by key, so placeholder art can be
  swapped without code changes.

---

## llm/npc-dialogue


- **The key stays on the server.** The browser only talks to `/api/*`. Never
  log, bundle or commit `OPENAI_API_KEY`. `.env` is gitignored.
- **Characters run on OpenAI, model GPT-6 Luna.** Read the current OpenAI API
  docs before writing SDK code. Take the exact model ID, streaming, tool
  calling and prompt caching details from there, not from memory. The model ID
  is read from env (`NPC_MODEL`).
- **Provider interface.** `LlmProvider` has `openai` and `mock`
  implementations. Tests, CI and `npm run dev:mock` use `mock`. No automated
  test may call the real API.
- **Persona cards are data** (`src/data/characters/`): identity, voice, wants,
  opinions, secrets, allowed actions and limits. The prompt builder assembles
  persona + world rules + game snapshot + allowed catalogue slice. Put the
  stable part (world rules, persona) first so it can be prompt cached.
- **The model proposes, the engine decides.** Anything that changes money,
  inventory, car stats, deals or relationships is a tool call validated on the
  server against hard limits (price floor per seller, catalogue membership,
  funds, relationship gates) and validated again on the client before the save
  changes. Free text never changes state.
- **Prices and specs come from the catalogue**, injected into the prompt and
  re-checked by the validator. A character quoting a number that is not in the
  catalogue is a bug.
- **Player text is untrusted.** It goes in the user turn only, never into the
  system prompt. Characters stay in the world and deflect attempts to change
  the rules in character. The validator, not the prompt, is the safeguard.
- **Purchases and contracts need an explicit player confirm** in the UI.
- **Stream replies**; show the first tokens fast. Cap reply length (a few
  sentences) and conversation history (recent turns plus a memory summary).
- **Fail in character.** On timeout or API error the character gets a short
  canned line ("Hang on, phone's ringing...") and the player can retry. The
  game is always playable without the network using the mock provider.
- **Personality is tested by reading it.** For any persona change, run a few
  real conversations and paste a short transcript in the spec's notes.

---

## data/real-world-catalogue


The promise to players is real cars, real parts, real prices. That only holds
if every number can be traced.

- **Never enter specs or prices from memory.** Look each one up and record
  where it came from. If a figure cannot be sourced, leave the record out.
- **Required fields, cars:** `id`, `make`, `model`, `generation`, `year`,
  `drivetrain`, `power_hp`, `torque_nm`, `weight_kg`, `price_usd` (a typical
  used market price for the game economy, labelled as such), `source_url`,
  `checked_on` (ISO date).
- **Required fields, parts:** `id`, `brand`, `name`, `part_number`, `category`
  (tyres, suspension, intake, exhaust, brakes, ...), `fits` (car ids),
  `price_usd` (manufacturer list price or a named retailer's listed price),
  `price_basis` (`msrp` or `retailer`), `source_url`, `checked_on`, and
  `effects` (the game stat changes).
- **`effects` are game design, not facts.** Derive them from documented rules
  in `src/rpg/` (for example a tyre's grip rating from its category), and keep
  them clearly separate from the sourced fields.
- **Zod validates the whole catalogue** in a unit test: required fields,
  https `source_url`, `checked_on` not in the future, `fits` pointing at real
  car ids, positive prices.
- **Prices age.** Show "price checked <date>" in the shop UI. A catalogue
  refresh is a normal maintenance task; never silently change a price without
  updating `checked_on` and `source_url`.
- **Names as facts only.** Make, model, brand and part names appear as plain
  text. No logos, badges, liveries, product photos or marketing copy copied
  from manufacturers or retailers. Descriptions are written fresh.
- **Fiction stays fictional.** Sponsors, teams, shops and people are invented.
  Do not put words in the mouth of a real company or person.

---

## testing/game-testing


- **Unit tests (Vitest)** cover the pure rules: physics step, lap timing, AI
  pace, economy, action validation, save migrations, catalogue schema.
- **Story tests (Playwright)** live in `tests/e2e/stories/US-###.spec.ts`,
  tagged `@US-###` and `@demo`, and always run with `LLM_PROVIDER=mock`.
- **Test hooks, dev and test builds only.** Expose `window.__game` with:
  `state()` (read-only snapshot), `loadSave(fixture)`, `goto(scene, params)`,
  and `race.fastForward({ finishPosition })`. Story tests use these to set up
  context and to finish a race quickly; they still drive the UI for the
  behaviour the story is about. Hooks are stripped from production builds.
- **HTML overlay for anything a story asserts on** (dialogue text, prices,
  money, results). Canvas pixels are not asserted; use accessible roles and
  labels so tests and screen readers both work.
- **Save fixtures** in `tests/fixtures/saves/` give reproducible starting
  points (fresh career, has money, has part uninstalled, has sponsor deal).
- **Seeded runs.** A `?seed=` query parameter fixes the race RNG.
- **Ports:** Vite 5173, API 8787. `npm run dev:mock` starts both with the mock
  provider; `agent-os/testing.yml` points at it.
- **Real-model checks are manual**, done by a person or agent reading a
  conversation, and are never part of `npm test`.

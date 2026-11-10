# Testing a game with agent-os stories

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

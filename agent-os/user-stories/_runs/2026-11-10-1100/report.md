# Story verification 2026-11-10 11:00

Level: demo | Scope: spec:2026-11-10-0900-bars-duels-race-lines, plus a regression run of US-001 to US-014 | App: mock servers on ports 5273/8887 | Browser: Playwright in installed Google Chrome (PW_CHANNEL=chrome)

All 18 story tests passed twice in a row. Unit suite: 146 tests passing.

| Story | AC | Browser | Unit | Test | Result |
|---|---|---|---|---|---|
| US-015 | AC1, AC2 | pass | | tests/e2e/stories/US-015.spec.ts | pass |
| US-015 | AC3 (unit) | | pass | src/data/catalogue.test.ts | pass |
| US-015 | AC4 (unit) | | pass | server/prompt.test.ts | pass |
| US-016 | AC1, AC2, AC3 | pass | | tests/e2e/stories/US-016.spec.ts | pass |
| US-016 | AC4 (unit) | | pass | src/rpg/actions.test.ts, server/tools.test.ts | pass |
| US-016 | AC5 (unit) | | pass | src/save/store.test.ts | pass |
| US-017 | AC1 | pass | | tests/e2e/stories/US-017.spec.ts | pass |
| US-017 | AC2, AC3 (unit) | | pass | src/race/feel.test.ts | pass |
| US-001 to US-014 | all browser ACs | pass | pass | tests/e2e/stories/ | pass (regression) |

## Notes

- The US-017 story test found a real gap: a rival who started alongside the
  player was never counted as passing. Fixed by noting the starting order.
- US-007 and US-012 tests use the start gates' new positions (the street is
  longer now that it has a bar). US-002 ignores the bar and the travel board
  when checking the five original buildings. Criteria unchanged.
- Flicker fix (same session): measured with a frame-to-frame check counting
  pixels that flip colour and flip straight back. Harbour straight 5,928 to 0,
  Harbour docks 15,146 to 0, Pinewood hills 3,481 to 0.
- Real GPT-6 Luna check: Nyx Calloway and Big Lou Ferreira stayed in voice
  and proposed duels through the tool; a $50,000 demand was capped at the
  house limit. Lou offered the full $1,000 although his card says he bets
  small. Kenji, Priya, Ro and Dmitri were not run against the real model.
- Not covered: a duel driven by hand to the finish; whether duel wagers
  unbalance the economy.

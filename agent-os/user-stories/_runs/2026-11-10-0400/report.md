# Story verification 2026-11-10 04:00

Level: demo | Scope: spec:2026-11-10-0030-race-feel-and-visual-pass, plus a regression run of US-001 to US-009 | App: http://localhost:5273 (mock servers on 5273/8887) | Browser: Playwright in installed Google Chrome (PW_CHANNEL=chrome) plus the Claude browser pane for the visual walk

All 11 story tests passed twice in a row. Unit suite: 102 tests passing. Screenshots: `screenshots/` (gitignored).

| Story | AC | Browser | Unit | Test | Result |
|---|---|---|---|---|---|
| US-010 | AC1 | pass | pass | tests/e2e/stories/US-010.spec.ts, src/race/feel.test.ts | pass |
| US-010 | AC2 (unit) | | pass | src/race/feel.test.ts | pass |
| US-010 | AC3 (unit) | | pass | src/race/feel.test.ts | pass |
| US-010 | AC4 (unit) | | pass | src/race/feel.test.ts | pass |
| US-010 | AC5 (unit) | | pass | src/race/feel.test.ts | pass |
| US-010 | AC6 (unit) | | pass | src/race/feel.test.ts | pass |
| US-011 | AC1 | pass | | tests/e2e/stories/US-011.spec.ts | pass |
| US-011 | AC2 | pass | | tests/e2e/stories/US-011.spec.ts | pass |
| US-001 to US-009 | all browser ACs | pass | pass | tests/e2e/stories/US-00N.spec.ts | pass (regression) |

## Notes

- US-003's test now checks the drawn portrait (an image named "Portrait of
  Mags Okafor") instead of the old initials tile. The criterion is unchanged.
- The visual walk covered the start, hairpin, cliffs, bridge and a handbrake
  slide on the Harbour Loop, the whole street, all four interiors and a
  conversation. No console errors from the current build.
- Not covered: a full race driven by hand. Handling was checked with unit
  tests, the autopilot and short scripted key presses.

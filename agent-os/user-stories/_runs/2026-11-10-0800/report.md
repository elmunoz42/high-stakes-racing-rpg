# Story verification 2026-11-10 08:00

Level: demo | Scope: spec:2026-11-10-0500-cars-locations-nitrous, plus a regression run of US-001 to US-011 | App: mock servers on ports 5273/8887 | Browser: Playwright in installed Google Chrome (PW_CHANNEL=chrome) plus the Claude browser pane for the visual walk

All 14 story tests passed twice in a row. Unit suite: 130 tests passing.

| Story | AC | Browser | Unit | Test | Result |
|---|---|---|---|---|---|
| US-012 | AC1 to AC3 | pass | | tests/e2e/stories/US-012.spec.ts | pass |
| US-012 | AC4 (unit) | | pass | src/rpg/actions.test.ts | pass |
| US-012 | AC5 (unit) | | pass | src/save/store.test.ts | pass |
| US-013 | AC1, AC2 | pass | | tests/e2e/stories/US-013.spec.ts | pass |
| US-013 | AC3 (unit) | | pass | src/rpg/actions.test.ts | pass |
| US-013 | AC4 (unit) | | pass | src/data/catalogue.test.ts | pass |
| US-014 | AC1 to AC3 | pass | | tests/e2e/stories/US-014.spec.ts | pass |
| US-014 | AC4 (unit) | | pass | src/race/feel.test.ts | pass |
| US-001 to US-011 | all browser ACs | pass | pass | tests/e2e/stories/ | pass (regression) |

## Notes

- The US-014 story test caught a real bug: skipping a race with the test
  hook dropped the nitrous shots already fired. Fixed in the fast-forward.
- US-002's test now ignores the new travel board when it checks the five
  original buildings. The criterion is unchanged.
- Horizon flicker: covered by a projection unit test (far ground is exactly
  the haze colour on whole pixel rows over a haze band) and checked by eye
  on all six tracks.
- Visual walk: all five new tracks with the autopilot, a nitrous shot at the
  Autodrome, the Pinewood street and the Autodrome clubhouse. No console errors.
- Real GPT-6 Luna check: Lupe Zamora quoted every car's real price and the
  correct trade-in sums and proposed the Corvette sale; Olav Frost answered
  in voice with an ice-driving tip. Birdie, Juno and Renata were not run
  against the real model.
- Not covered: full races driven by hand at the new locations; the economy
  across a whole career (how many races it takes to afford each car).

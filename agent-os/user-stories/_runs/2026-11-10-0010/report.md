# Story verification 2026-11-10 00:10

Level: demo | Scope: spec:2026-11-09-2300-m1-vertical-slice | App: http://localhost:5173 (npm run dev:mock) | Browser: Playwright in installed Google Chrome 157 (PW_CHANNEL=chrome) plus the Claude browser pane for the manual walk

All in-scope criteria are happy path; the spec has no `(edge)` criteria or production-only stories, so nothing was skipped for the level. Each story's e2e test passed twice in a row. Unit suite: 94 tests passing. Screenshots: `screenshots/` (gitignored).

| Story | AC | Browser | Unit | Test | Result |
|---|---|---|---|---|---|
| US-001 | AC1 | pass | | tests/e2e/stories/US-001.spec.ts | pass |
| US-001 | AC2 | pass | | tests/e2e/stories/US-001.spec.ts | pass |
| US-001 | AC3 (unit) | | pass | src/data/catalogue.test.ts | pass |
| US-002 | AC1 | pass | | tests/e2e/stories/US-002.spec.ts | pass |
| US-002 | AC2 | pass | | tests/e2e/stories/US-002.spec.ts | pass |
| US-002 | AC3 | pass | | tests/e2e/stories/US-002.spec.ts | pass |
| US-003 | AC1 | pass | | tests/e2e/stories/US-003.spec.ts | pass |
| US-003 | AC2 | pass | | tests/e2e/stories/US-003.spec.ts | pass |
| US-003 | AC3 | pass | | tests/e2e/stories/US-003.spec.ts | pass |
| US-003 | AC4 | pass | pass | tests/e2e/stories/US-003.spec.ts, server/app.test.ts | pass |
| US-003 | AC5 (unit) | | pass | server/prompt.test.ts | pass |
| US-004 | AC1 | pass | | tests/e2e/stories/US-004.spec.ts | pass |
| US-004 | AC2 | pass | | tests/e2e/stories/US-004.spec.ts | pass |
| US-004 | AC3 | pass | | tests/e2e/stories/US-004.spec.ts | pass |
| US-004 | AC4 (unit) | | pass | src/rpg/actions.test.ts, server/tools.test.ts | pass |
| US-004 | AC5 (unit) | | pass | src/data/catalogue.test.ts | pass |
| US-005 | AC1 | pass | | tests/e2e/stories/US-005.spec.ts | pass |
| US-005 | AC2 | pass | | tests/e2e/stories/US-005.spec.ts | pass |
| US-005 | AC3 (unit) | | pass | src/rpg/actions.test.ts, src/rpg/carStats.test.ts | pass |
| US-006 | AC1 | pass | | tests/e2e/stories/US-006.spec.ts | pass |
| US-006 | AC2 | pass | | tests/e2e/stories/US-006.spec.ts | pass |
| US-006 | AC3 (unit) | | pass | src/rpg/actions.test.ts, server/tools.test.ts | pass |
| US-007 | AC1 | pass | | tests/e2e/stories/US-007.spec.ts | pass |
| US-007 | AC2 | pass | | tests/e2e/stories/US-007.spec.ts | pass |
| US-007 | AC3 | pass | | tests/e2e/stories/US-007.spec.ts (fast-forward to the finish) | pass |
| US-007 | AC4 (unit) | | pass | src/race/sim.test.ts | pass |
| US-007 | AC5 (unit) | | pass | src/race/sim.test.ts | pass |
| US-008 | AC1 | pass | | tests/e2e/stories/US-008.spec.ts | pass |
| US-008 | AC2 | pass | | tests/e2e/stories/US-008.spec.ts | pass |
| US-008 | AC3 | pass | | tests/e2e/stories/US-008.spec.ts | pass |
| US-008 | AC4 (unit) | | pass | src/rpg/actions.test.ts | pass |
| US-009 | AC1 | pass | | tests/e2e/stories/US-009.spec.ts | pass |
| US-009 | AC2 (unit) | | pass | src/save/store.test.ts | pass |

## Notes

- No failures. No console errors during the manual walk.
- Story tests run against the scripted mock characters. Real GPT-6 Luna conversations were checked separately (spec `notes.md`).
- US-007 AC3 reaches the finish with the fast-forward test hook, as the story's notes allow; a full three-lap race by hand was not driven in this run.
- Playwright's bundled Chromium 1254 could not be installed: the disk had about 650 MB free. Tests ran in the installed Google Chrome instead.

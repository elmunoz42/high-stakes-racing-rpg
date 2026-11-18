---
id: US-016
title: Race a rival one on one at night for money
status: verified
priority: must
source: spec:2026-11-10-0900-bars-duels-race-lines
tags: [bar, duel, race, economy]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-016.spec.ts]
  unit: [src/rpg/actions.test.ts, src/save/store.test.ts, server/tools.test.ts, src/race/feel.test.ts]
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want to challenge a racer to a one-on-one night race for money, so that I can gamble on my own driving.

## Acceptance criteria

- AC1: Given I am talking to a racer, when I pick a wager and confirm, then a night race starts with only the two of us on the grid.
- AC2: Given I win the duel, then the result names the racer I beat, my money goes up by the wager, and my record against them shows the win.
- AC3: Given I lose the duel, then my money goes down by the wager.
- AC4 (unit): A wager above the location's cap, above my money, below the minimum, or against someone who is not a racer is rejected.
- AC5 (unit): A version 2 save is migrated to version 3 with no duel records.

## Test data

- Fixture: tests/fixtures/saves/has-money.json
- Seed: ?seed=42

## Notes

- Duels are two laps and do not count for sponsors, unlocks or prize money.

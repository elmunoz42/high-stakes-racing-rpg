---
id: US-012
title: Travel to a new race location
status: verified
priority: must
source: spec:2026-11-10-0500-cars-locations-nitrous
tags: [travel, career]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-012.spec.ts]
  unit: [src/rpg/actions.test.ts, src/save/store.test.ts, src/race/feel.test.ts, src/data/catalogue.test.ts]
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want to travel to new race locations as I prove myself, so that the career has somewhere to go.

## Acceptance criteria

- AC1: Given I am in town, when I use the travel sign, then I see all six locations with their travel cost and which are locked.
- AC2: Given a location is unlocked and I can afford the trip, when I travel there, then I arrive in that town, my money drops by the travel cost, and its start gate names its own track.
- AC3: Given I am at another location, when I race and finish, then the results name that location's track and the prize is larger than the same position pays at the first location.
- AC4 (unit): A location is locked until I have finished on the podium at the one before it, and travel to a locked location or one I cannot afford is rejected.
- AC5 (unit): A version 1 save is migrated to version 2 with no nitrous and only the first location's progress.

## Test data

- Fixture: tests/fixtures/saves/podium-at-harbour.json (a podium at the first location)
- The version 1 fixtures exercise the migration in every other story test

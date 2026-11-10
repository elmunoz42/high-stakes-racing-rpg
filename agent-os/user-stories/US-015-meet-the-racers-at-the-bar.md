---
id: US-015
title: Meet the racers at the bar
status: verified
priority: must
source: spec:2026-11-10-0900-bars-duels-race-lines
tags: [bar, dialogue, racers]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-015.spec.ts]
  unit: [src/data/catalogue.test.ts, server/prompt.test.ts]
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want a bar in every city where the other racers hang out, so that my rivals are people I can talk to.

## Acceptance criteria

- AC1: Given I am in town, when I enter the bar, then I see all six racers by name.
- AC2: Given I am in the bar, when I walk up to a racer and talk, then a conversation opens with their name and portrait and they reply in their own voice.
- AC3 (unit): Every location has a bar, and every racer has a persona card.
- AC4 (unit): A racer's prompt includes the car they drive at this location and my record against them.

## Test data

- Fixture: tests/fixtures/saves/has-money.json
- Mock scripts for the six racers.

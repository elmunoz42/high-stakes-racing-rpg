---
id: US-014
title: Buy and use nitrous
status: verified
priority: must
source: spec:2026-11-10-0500-cars-locations-nitrous
tags: [shop, race, nitrous]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-014.spec.ts]
  unit: [src/rpg/actions.test.ts, src/race/feel.test.ts]
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want to buy nitrous shots in town and fire them in a race, so that I have a boost for the moment it matters.

## Acceptance criteria

- AC1: Given I am at the parts counter, when I buy a nitrous shot and confirm, then my money drops by its price and my shot count goes up, to a maximum of three.
- AC2: Given I have a shot and I am racing, when I press the nitrous key, then the HUD shows one fewer shot and the car accelerates harder for a few seconds.
- AC3: Given I used shots in a race, when the race ends, then those shots are gone from my career.
- AC4 (unit): A nitrous shot makes the car faster over the same distance, and firing with no shots does nothing.

## Test data

- Fixture: tests/fixtures/saves/has-money.json

## Notes

- Nitrous key: N or Shift.

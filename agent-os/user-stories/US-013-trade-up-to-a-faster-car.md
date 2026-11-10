---
id: US-013
title: Trade up to a faster car
status: verified
priority: must
source: spec:2026-11-10-0500-cars-locations-nitrous
tags: [dealer, economy, dialogue]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-013.spec.ts]
  unit: [src/rpg/actions.test.ts, src/data/catalogue.test.ts]
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want to trade my car in for a faster one, so that I can compete at the tougher locations.

## Acceptance criteria

- AC1: Given I am talking to the car dealer, then I see the real cars for sale with power, weight, price, my trade-in value and what I would pay.
- AC2: Given I can afford a car, when I choose it and confirm, then it becomes my car, my money drops by the price less the trade-in, and my fitted parts go with the old car.
- AC3 (unit): Buying a car I cannot afford, an unknown car, or the car I already own is rejected.
- AC4 (unit): Every car in the catalogue passes the schema with a source and check date.

## Test data

- Fixture: tests/fixtures/saves/rich-at-dustbowl.json

## Notes

- Trade-in: 70 percent of the car's price plus half the list price of fitted parts.

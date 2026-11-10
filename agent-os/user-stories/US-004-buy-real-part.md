---
id: US-004
title: Buy a real part from the parts seller
status: verified
priority: must
source: spec:2026-11-09-2300-m1-vertical-slice
tags: [shop, economy, dialogue]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-004.spec.ts]
  unit: [src/rpg/actions.test.ts, server/tools.test.ts, src/data/catalogue.test.ts]
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want to buy a real aftermarket part at its real price, so that my build is something I could price up in real life.

## Acceptance criteria

- AC1: Given I am talking to the parts seller, when I open her catalogue, then I see real parts that fit my car, each with brand, name, part number, price and the date the price was checked.
- AC2: Given I have enough money, when I choose a part and confirm the purchase, then my money drops by the price and the part is in my inventory as not installed.
- AC3: Given I ask the seller for a better price, when she agrees to a discount, then the offered price is lower and I can confirm at that price.
- AC4 (unit): A discount below the seller's floor, a part not in the catalogue, or a price the player cannot afford is rejected by the action validator.
- AC5 (unit): Every part in the catalogue passes the schema, including a source link, price basis and the date it was checked.

## Test data

- Fixture: tests/fixtures/saves/has-money.json
- Mock script for Dee Dee Varga: agrees to 10 percent off on the second ask.

## Notes

- Haggle floor for M1: 15 percent off list.

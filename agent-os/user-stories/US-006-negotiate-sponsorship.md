---
id: US-006
title: Negotiate a sponsorship deal
status: verified
priority: must
source: spec:2026-11-09-2300-m1-vertical-slice
tags: [sponsor, dialogue, economy]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-006.spec.ts]
  unit: [src/rpg/actions.test.ts, server/tools.test.ts]
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want to talk a sponsor into backing me, so that I earn money for how I race.

## Acceptance criteria

- AC1: Given I am talking to the sponsor rep, when he offers a deal, then I see its objective and payout before I accept.
- AC2: Given an offered deal, when I accept it, then it is listed as my active sponsor with its objective.
- AC3 (unit): A sponsorship payout outside the sponsor's allowed range is rejected by the action validator.

## Test data

- Fixture: fresh-career.json
- Mock script for Sterling Pruitt: offers 'finish in the top 3' for a fixed payout.

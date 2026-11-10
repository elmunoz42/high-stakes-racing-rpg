---
id: US-008
title: Collect prize money and sponsor payout
status: draft
priority: must
source: spec:2026-11-09-2300-m1-vertical-slice
tags: [race, economy, sponsor]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: []
  unit: []
---

As a player, I want to be paid for my result, so that racing funds the next upgrade.

## Acceptance criteria

- AC1: Given I finish a race, then the results screen shows the prize money for my position and my new balance.
- AC2: Given I have an active sponsor deal and I met its objective, then the results screen shows the sponsor payout added to my balance.
- AC3: Given I return to town after a race, when I talk to my coach, then she refers to my finishing position.
- AC4 (unit): Prize money by position and sponsor objective checks are computed from the race result.

## Test data

- Fixture: tests/fixtures/saves/has-sponsor-deal.json
- fastForward({ finishPosition: 2 })

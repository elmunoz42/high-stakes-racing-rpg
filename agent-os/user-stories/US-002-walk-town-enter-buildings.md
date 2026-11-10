---
id: US-002
title: Walk the town and enter buildings
status: verified
priority: must
source: spec:2026-11-09-2300-m1-vertical-slice
tags: [town]
sets: [demo, production]
verify: [browser]
tests:
  e2e: [tests/e2e/stories/US-002.spec.ts]
  unit: []
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want to walk a side-scrolling town and go into its buildings, so that the race location feels like a place.

## Acceptance criteria

- AC1: Given I am in the town, when I hold right or left, then my character walks and the street scrolls.
- AC2: Given I am standing at a building door, when I press the interact key, then I am inside and the character who works there is present.
- AC3: Given I am in the town, then I can find the garage, the parts shop, the sponsor lounge, the coach and the start gate.

## Test data

- Fixture: tests/fixtures/saves/fresh-career.json

## Notes

- Canvas movement is asserted through window.__game.state(), not pixels.

---
id: US-010
title: Feel the car's limits
status: verified
priority: must
source: spec:2026-11-10-0030-race-feel-and-visual-pass
tags: [race, physics]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-010.spec.ts]
  unit: [src/race/feel.test.ts]
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want the car to have weight and a grip limit I can feel, so that driving well is a skill and upgrades matter.

## Acceptance criteria

- AC1: Given I am racing at speed, when I pull the handbrake while steering, then the car slides, tyre smoke appears and I lose speed.
- AC2 (unit): Entering a corner too fast pushes the car wide and scrubs speed; at a sensible speed it holds its line.
- AC3 (unit): Following closely behind another car gives a slipstream that raises speed on a straight.
- AC4 (unit): The car changes up through its gears as it accelerates, and revs rise within each gear.
- AC5 (unit): With the same inputs, a rear-drive car power-slides where a front-drive car does not.
- AC6 (unit): When two cars touch, both are affected and the contact is counted once.

## Test data

- Fixture: tests/fixtures/saves/fresh-career.json
- Seed: ?seed=42

## Notes

- Handbrake is Space.

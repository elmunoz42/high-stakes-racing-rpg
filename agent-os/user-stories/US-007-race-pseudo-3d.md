---
id: US-007
title: Race against AI rivals
status: draft
priority: must
source: spec:2026-11-09-2300-m1-vertical-slice
tags: [race]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: []
  unit: []
---

As a player, I want to race my car against rivals on a pseudo-3D road, so that the build and the advice pay off on track.

## Acceptance criteria

- AC1: Given I am at the start gate, when I choose to race, then the race starts after a countdown with my car and five rivals on the grid.
- AC2: Given the race is running, when I accelerate and steer, then my car speeds up and moves across the road, and the HUD shows speed, lap and position.
- AC3: Given I complete the final lap, then the race ends and I see the finishing order with my position and time.
- AC4 (unit): With the same seed and inputs, the race simulation produces the same result.
- AC5 (unit): A car with more power reaches a higher top speed and a car with more grip takes a corner faster, all else equal.

## Test data

- Fixture: fresh-career.json
- Seed: ?seed=42

## Notes

- Story tests may use window.__game.race.fastForward to reach the finish.

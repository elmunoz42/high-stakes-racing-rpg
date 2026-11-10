---
id: US-011
title: Read the race from the HUD
status: verified
priority: must
source: spec:2026-11-10-0030-race-feel-and-visual-pass
tags: [race, hud]
sets: [demo, production]
verify: [browser]
tests:
  e2e: [tests/e2e/stories/US-011.spec.ts]
  unit: []
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want the HUD to show revs, gear and where everyone is on the lap, so that I can judge shifts, gaps and progress at a glance.

## Acceptance criteria

- AC1: Given the race is running, when I accelerate from the start, then the HUD shows the current gear and it goes up as I gain speed.
- AC2: Given the race is running, then a lap progress strip shows a marker for me and for each rival.

## Test data

- Fixture: fresh-career.json
- Seed: ?seed=42

---
id: US-005
title: Have the mechanic install a part
status: draft
priority: must
source: spec:2026-11-09-2300-m1-vertical-slice
tags: [garage, dialogue]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: []
  unit: []
---

As a player, I want my mechanic to fit a part I own, so that my car actually gets better.

## Acceptance criteria

- AC1: Given I own a part that is not installed, when I ask the mechanic to fit it and confirm the labour cost, then the part shows as installed on my car.
- AC2: Given a part was just installed, then the car sheet shows the changed stats with before and after values.
- AC3 (unit): Installing a part applies its effects to the derived car stats once, and installing a second part in the same slot replaces the first.

## Test data

- Fixture: tests/fixtures/saves/has-uninstalled-part.json

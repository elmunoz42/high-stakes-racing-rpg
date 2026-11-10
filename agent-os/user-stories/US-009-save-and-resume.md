---
id: US-009
title: Save and resume a career
status: draft
priority: must
source: spec:2026-11-09-2300-m1-vertical-slice
tags: [save]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: []
  unit: []
---

As a player, I want my career saved automatically, so that I can close the tab and carry on later.

## Acceptance criteria

- AC1: Given I have a career in progress, when I reload the page and choose Continue, then I am back in the town with the same car, parts, money and sponsor.
- AC2 (unit): A save from an older schema version is migrated to the current version on load.

## Test data

- Fixture: has-sponsor-deal.json

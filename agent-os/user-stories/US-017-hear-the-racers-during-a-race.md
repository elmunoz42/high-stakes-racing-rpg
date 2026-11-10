---
id: US-017
title: Hear the racers during a race
status: draft
priority: must
source: spec:2026-11-10-0900-bars-duels-race-lines
tags: [race, racers]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: []
  unit: []
---

As a player, I want the other racers to say things when we pass or touch, so that the race feels like it is against people.

## Acceptance criteria

- AC1: Given a rival passes me in a race, then a speech bubble shows their name and one of their own lines.
- AC2 (unit): The simulation reports when I pass a rival, when a rival passes me, and when I touch a rival, once per event.
- AC3 (unit): Every racer has at least ten lines, covering all three events, and no line is shared between racers.

## Test data

- Fixture: fresh-career.json
- Seed: ?seed=42

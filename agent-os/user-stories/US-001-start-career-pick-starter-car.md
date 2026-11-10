---
id: US-001
title: Start a career and pick a starter car
status: draft
priority: must
source: spec:2026-11-09-2300-m1-vertical-slice
tags: [career, garage]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: []
  unit: []
---

As a new player, I want to start a career and choose a real starter car, so that I have a car and a budget to begin with.

## Acceptance criteria

- AC1: Given no saved game, when I open the game and choose New Career, then I see three real starter cars, each with make, model, year, power, weight and price.
- AC2: Given the starter car list, when I pick a car and confirm, then I arrive in the first town with that car shown as my car and my starting money shown.
- AC3 (unit): Every car in the catalogue passes the schema, including a source link and the date it was checked.

## Test data

- No save in localStorage.

## Notes

- Car data follows the data/real-world-catalogue standard.

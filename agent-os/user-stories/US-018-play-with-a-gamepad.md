---
id: US-018
title: Play with a gamepad
status: verified
priority: should
source: request:2026-11-18 Xbox controller on Windows, gamepads on Mac and Windows
tags: [input, race, town, ui]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-018.spec.ts]
  unit: [src/game/padmap.test.ts]
verified_level: demo
last_verified: 2026-11-18
---

As a player, I want to play with an Xbox controller on Windows, or any gamepad my browser recognises on Mac or Windows, so that I can race and explore from the couch.

## Acceptance criteria

- AC1: Given a controller is connected, when I am on a menu (title, car pick, results, a conversation), then the D-pad or stick moves between the buttons, A presses the highlighted one and B backs out.
- AC2: Given I am in town, when I push the stick or D-pad, then I walk; A at a door goes inside; B leaves a room.
- AC3: Given a race is running, when I pull the right trigger and push the stick, then the car speeds up and steers in proportion to the stick; the left trigger brakes, B is the handbrake, Y or RB fires nitrous.
- AC4 (unit): Stick dead zones, analog triggers, D-pad, buttons and unrecognised pads map to the right controls.
- AC5: Given I have used the controller, then on-screen control hints show controller buttons; pressing a key switches them back.

## Test data

- Fixture: fresh-career.json
- The browser test stands in a scripted controller for navigator.getGamepads.

## Notes

- Uses the browser Gamepad API (standard mapping): Chrome and Edge on Windows report Xbox controllers this way; Chrome, Edge and Firefox on Mac report most pads this way.
- A short rumble plays on contact with another car, on pads that support it.

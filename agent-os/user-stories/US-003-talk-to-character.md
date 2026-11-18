---
id: US-003
title: Talk to a character in free text
status: verified
priority: must
source: spec:2026-11-09-2300-m1-vertical-slice
tags: [dialogue, llm]
sets: [demo, production]
verify: [browser, unit]
tests:
  e2e: [tests/e2e/stories/US-003.spec.ts]
  unit: [server/prompt.test.ts, server/app.test.ts]
verified_level: demo
last_verified: 2026-11-10
---

As a player, I want to talk to a character in my own words and get replies in their voice, so that the paddock feels alive.

## Acceptance criteria

- AC1: Given I am next to a character, when I press interact, then a dialogue panel opens with their name, portrait and a greeting.
- AC2: Given the dialogue panel is open, when I type a message and send it, then the character's reply streams into the panel.
- AC3: Given the dialogue panel is open, then I see suggested lines I can pick instead of typing.
- AC4: Given I ask the coach about my car, then her reply mentions the car I actually own.
- AC5 (unit): The prompt builder includes the persona card, the game snapshot and only the actions that character is allowed to propose.

## Test data

- Fixture: fresh-career.json
- LLM_PROVIDER=mock with the scripted replies for Mags Okafor.

## Notes

- Real-model personality is checked by reading transcripts, not by automated tests.

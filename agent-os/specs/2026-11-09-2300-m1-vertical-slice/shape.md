# M1 Vertical Slice — Shaping Notes

## Scope

The smallest build that proves the idea: an arcade race and a talkative
paddock that feed each other. One town, four LLM-driven characters, a small
sourced catalogue of real cars and parts, one race, save and resume.

## Decisions

Owner decisions (2026-11-09):

- **Racing is retro pseudo-3D** (sprite-scaled road on a 2D canvas), not real
  3D.
- **LLM hosting is local only for now.** The owner's OpenAI credential sits in
  `.env` behind a small local server. Public hosting is deferred to M5.
- **Testing level is demo.**
- **Character dialogue runs on OpenAI, model GPT-6 Luna**, using the owner's
  OpenAI subscription.
- Street cars, real cars, real parts at real prices.
- RPG immersion carries equal weight to the racing.

Planning decisions (changeable, but change the product docs if you do):

- Phaser for scenes; road renderer and all rules as pure TypeScript.
- HTML overlay for dialogue, shop, garage and HUD so text is accessible and
  testable.
- LLM proposes actions as tool calls; server and client validators decide.
- Mock LLM provider is the default for tests and for `npm run dev:mock`.
- Save in localStorage; server stateless.
- Sponsors, shops and people are invented; cars and parts are real names used
  factually with no logos or official imagery.
- The game is an original work in the arcade-racer genre. It does not reuse
  any existing game's name, tracks, characters, art, music or UI.

## Open questions for the owner (none block M1)

- Whether the OpenAI subscription covers API calls or a separate API key is
  needed (to be confirmed from OpenAI's docs at Task 8).
- The game's name.
- Which three starter cars, once the candidates are sourced.
- Whether real-world car and part names stay if the game is released
  publicly (legal review is scheduled in M5).

## Context

- **Visuals:** none provided. Placeholder art in M1.
- **References:** no existing code; greenfield.
- **Product alignment:** this is roadmap milestone M1.

## Standards Applied

- game/architecture — module boundaries and determinism
- llm/npc-dialogue — everything in tasks 8 and 9
- data/real-world-catalogue — task 4
- testing/game-testing — hooks, fixtures and story tests

# Game architecture

- **Rules are pure, scenes are thin.** `src/race/` and `src/rpg/` contain no
  Phaser, DOM or network imports. Scenes read state, call rule functions and
  draw. If logic is hard to unit test, it is in the wrong place.
- **One game state object**, serialisable, owned by a store in `src/save/`.
  Scenes never keep career data in their own fields.
- **State changes go through actions** (`applyAction(state, action) -> state`)
  that validate first and return a typed error on failure. No direct mutation
  from UI or dialogue code.
- **Deterministic simulation.** Race physics runs on a fixed 60 Hz timestep
  with a seeded RNG passed in. No `Math.random()` or `Date.now()` in rules.
- **Content is data.** Cars, parts, characters, locations and tracks are typed
  data files validated by Zod. Adding a car or a character must not need a code
  change outside `src/data/`.
- **Race engine behind an interface** (`RaceEngine`, `RaceRenderer`) so the
  renderer can be replaced without touching rules or RPG code.
- **Assets via a manifest**, referenced by key, so placeholder art can be
  swapped without code changes.

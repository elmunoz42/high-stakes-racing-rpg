# Bars, Night Duels and Race Lines — Shaping Notes

## Scope (owner request, 2026-11-10)

- A bar in each city where you can see all six racers and chat with them.
- Challenge a racer to a one-on-one night race for game money.
- During races, each racer has about ten lines of their own that they say
  when you pass them, when they pass you, and when you bump. Predefined for now.

## Decisions

- **Six racers:** the five rivals already on the grid (Kenji "Static" Morrow,
  Priya Nandakumar, "Big" Lou Ferreira, Rosa "Ro" Esposito, Dmitri Volk) get
  full persona cards, plus one new racer, Nyx Calloway, who only races at
  night for money. Day races stay at six cars: the five rivals and you.
- **Bars:** one per location, each with its own name, generated from a sign
  like the local businesses. All six racers stand inside; walk up and talk.
- **Chat:** racers run on the same LLM dialogue as everyone else, with their
  own tool, `propose_duel`. The wager is validated by the game.
- **Duels:** one against one, two laps, at night, on the location's track,
  the racer in the car they drive at that location. Wager from $100 up to a
  cap that grows with the location's tier, and never more than you have.
  Win and you gain the wager; lose and you pay it. A win/loss record per
  racer is kept. Duels do not count for sponsors, unlocks or prize money.
- **Race lines:** ten per racer (four when you pass them, three when they
  pass you, three on contact), shown as a speech bubble. The simulation
  reports pass and bump events; the scene picks the line.
- **Save format v3** (duel records), with a migration from v2.

## Out of scope

Racers remembering duel results in LLM-generated race lines, betting odds,
spectators, voice.

## Standards Applied

game/architecture, llm/npc-dialogue, testing/game-testing.

# Cars, Locations and Nitrous — Shaping Notes

## Scope (owner request, 2026-11-10)

- Three more, racier cars: Corvette, Mustang, Viper.
- Five more race locations.
- Nitrous, bought in town. The owner clarified: "nitrous as in turbo boost",
  an arcade boost button, not a simulated kit.
- Fix the flickering beige artifacts at the horizon on the race track.

## Decisions

- **Cars:** 1990 Chevrolet Corvette (C4), 1988 Ford Mustang GT 5.0 and 1994
  Dodge Viper RT/10, sourced like the starters. They are not starter cars:
  a new character, a used-performance dealer, sells them with a trade-in on
  your current car (70% of its price plus half the list price of fitted parts).
- **Locations:** six in total, in tiers. A podium at one location unlocks the
  next. Each has its own track, look (time of day, ground, scenery), street
  and one local character. The paddock travels: Mags, Teo, Dee Dee and
  Sterling appear at every location in a trailer, truck, van and tent.
  Travel costs money; prize money scales with the tier; rivals drive faster
  cars at higher tiers.
- **Nitrous:** up to three shots, bought from Dee Dee at an invented shop
  price (it is a service, like labour, not a catalogue part). One key press
  fires a shot: a few seconds of extra acceleration and top speed. Shots
  used in a race are gone.
- **Horizon:** distant ground now fades fully into the haze colour and loses
  its stripe contrast, far sprites fade in, and a haze band covers the seam.
- **Save format v2** (travel progress and nitrous), with a migration from v1.

## Out of scope

Damage and wear, part compatibility beyond the catalogue, selling parts,
weather, final art.

## Standards Applied

game/architecture, data/real-world-catalogue, llm/npc-dialogue, testing/game-testing.

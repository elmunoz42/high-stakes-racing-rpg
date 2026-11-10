# Product Roadmap

Every milestone ships progress on **both** halves (race and paddock). Each
milestone is one or more specs in `agent-os/specs/`, shaped with `/shape-spec`
and closed with `/verify-stories`.

## M0: Foundation (done 2026-11-09)

- git repository, agent-os 3.1-fork installed at demo level
- mission, tech stack, roadmap, game design, standards
- M1 spec and user stories US-001 to US-009 written

## M1: Vertical slice (MVP), done 2026-11-10: spec `2026-11-09-2300-m1-vertical-slice`

Shipped: stories US-001 to US-009 verified at demo level. Starter cars: 1994
Mazda MX-5 Miata, 1991 Volkswagen GTI 16V, 1991 Nissan 240SX. 14 sourced
parts. Characters run on OpenAI `gpt-6-luna`.

One location, one race, the full loop end to end with placeholder art.

- Project scaffold (Vite, TypeScript, Phaser, Hono, Vitest, Playwright)
- New career: pick one of three real starter cars
- One town (side-scroller) with four characters: coach, mechanic, parts seller,
  sponsor rep, each with LLM dialogue, a persona card and game actions
- Parts shop with a small sourced catalogue (about 12 real parts across tyres,
  suspension, intake/exhaust, brakes) at real list prices, with haggling
- Mechanic installs parts; car stats change
- One sponsorship deal that can be negotiated and pays out on a race objective
- One pseudo-3D race (3 laps, 5 AI rivals) where car stats matter
- Results, prize money, sponsor payout, save and resume

## Race feel and visual pass (done 2026-11-10): spec `2026-11-10-0030-race-feel-and-visual-pass`

Pulled forward from M2 and M4 after the owner's first play. Weightier
physics (grip limit, slides, FWD/RWD traits, handbrake, slipstream, gears),
new canvas-drawn race and town art, effects, tachometer HUD, portraits.
Stories US-010 and US-011.

## Cars, locations and nitrous (done 2026-11-10): spec `2026-11-10-0500-cars-locations-nitrous`

Three more sourced cars (1988 Mustang GT, 1990 Corvette, 1994 Viper RT/10)
sold by a dealer with trade-in; six tiered locations with their own tracks,
looks and a local character each, unlocked by podiums; nitrous shots bought
at the parts counter; horizon flicker fixed. Stories US-012 to US-014.
Pulls the world map, travel costs and tiered prizes forward from M3.

## Bars, night duels and race lines (done 2026-11-10): spec `2026-11-10-0900-bars-duels-race-lines`

A bar in every location with six racers to talk to (the five rivals plus
Nyx Calloway, who only races at night); one-on-one night duels for a wager;
ten race lines per racer for passing, being passed and contact. Also the
horizon and scenery flicker fix, verified by a frame-to-frame pixel check.
Stories US-015 to US-017. Pulls rivals-as-characters forward from M3.

## M2: Garage and economy depth

- Catalogue grows to about 10 cars and 80 parts, all sourced
- Used car lot: buy and sell cars
- Part compatibility per car, install time and labour cost, wear
- Tuning (tyre pressure, gearing, ride height) through conversation with the
  mechanic
- Multiple sponsors with competing objectives and contract terms
- Race handling: damage and tyre wear (drifting, slipstream and the grip model
  shipped in the race feel pass)

## M3: Career and world

- World map with 5 or more race locations, each with its own town, cast and
  track, plus travel costs
- Season structure: entry fees, standings, class restrictions, a rival driver
  with their own arc
- Long-term NPC memory and relationship levels that unlock discounts, deals and
  story beats
- Characters who know about each other and gossip
- Night and weather variants of tracks

## M4: Feel and polish

- Final pixel art for cars, towns and characters, with portraits and expressions
- Original soundtrack and engine/tyre audio
- Gamepad support, key rebinding, settings
- Onboarding and a first-hour story script
- Performance pass, mobile and touch controls

## M5: Public release

- Hosting decision (owner key with a hosted proxy, or bring-your-own-key)
- Rate limiting, abuse and content safeguards on the dialogue proxy
- Raise testing level to production; full security audit
- Legal review of real car and part names before launch; final game name
- Price refresh job for the parts catalogue

## Later / ideas

- Optional real-3D race renderer behind the race engine interface
- Time-attack ghosts and shareable builds
- Voice for characters

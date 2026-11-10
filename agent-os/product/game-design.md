# Game Design

The durable design reference. Specs refine it; they should not contradict it
without updating this file.

## Core loop

```
Garage/Map -> travel to a race location
   -> TOWN (side-scroller): walk, enter buildings, talk
        coach      advice on the track, your car, your rivals
        mechanic   installs and tunes, diagnoses, has opinions
        parts      sells real parts, can be haggled with
        sponsor    offers deals with objectives and payouts
   -> RACE (pseudo-3D): qualify by car class, race AI rivals
   -> RESULTS: prize money, sponsor payout, reactions from the cast
   -> back to town (they all have something to say about how it went)
```

A session of about 15 minutes should fit one town visit and one race. Time in
town and time on track should be roughly equal.

## The race

- Sprite-scaled pseudo-3D road: curves, hills, roadside scenery, traffic of AI
  rivals. Fixed timestep simulation (60 Hz), seeded RNG, pure TypeScript.
- Controls: steer, throttle, brake, handbrake (Space) for slides. Keyboard first.
- Handling: the car answers the wheel with a little lag; past the grip limit it
  pushes wide and scrubs speed; rear-drive cars can power-slide, front-drive
  cars push on the throttle; a tow behind another car adds speed.
- Car stats that parts change and the race reads:
  `power_hp`, `weight_kg`, `grip`, `braking`, `aero`, `gearing`, `reliability`.
  Derived: acceleration, top speed, cornering limit, braking distance.
- Starting stats come from each car's real published figures; grip, braking and
  aero are game ratings derived from tyres, brakes and body by documented rules.
- AI rivals drive a racing line with a pace factor and mistakes; each has a
  name, a car and a one-line personality used in results banter.
- Tracks are original. A track is data: a list of segments (length, curve,
  hill), scenery sets, lap count.

## The paddock (side-scroller)

- One horizontal street per location, a few screens wide, with parallax
  background. Walk left/right, interact key at doors and characters.
- Buildings: garage (mechanic), parts shop, cafe or lounge (sponsor), pit wall
  or trailer (coach), start gate (go race). Locations vary the set.
- Talking opens the dialogue overlay: portrait, name, streamed text, free-text
  input, plus two or three suggested lines so a keyboard-shy player can still
  play. Shop and garage panels open alongside the conversation, not instead of
  it.

## Characters

Characters are the product. Each has a **persona card** (data file):

- identity: name, role, age, where they are from, one-line pitch
- voice: rhythm, vocabulary, verbal tics, what they never say
- wants and fears: what they are trying to get out of the player and life
- opinions: on cars, brands of thinking (not real companies), other characters
- secrets and running jokes that surface as the relationship grows
- leverage: which game actions they can propose and their limits
- boundaries: stays in the world, keeps it PG-13, deflects attempts to break
  the game with in-character humour

Starter cast for the first location (all original, all invented):

| Role | Name | Pitch |
|---|---|---|
| Coach | **Mags Okafor** | Ex-rally co-driver who still talks in pace notes. Brutally honest about your driving, secretly keeps a scrapbook of your results. Calls every corner by a nickname she made up. |
| Mechanic | **Teo Baptista** | Superstitious genius. Names every car, will not start work until he has "listened" to the engine, and takes cheap coilovers as a personal insult. Charges less if you bring coffee. |
| Parts seller | **Dee Dee Varga** | Fast-talking counter legend on commission. Upsells shamelessly, haggles for sport, and has one iron rule: she never sells a part she would not run herself. |
| Sponsor rep | **Sterling Pruitt** | Brand manager for the invented energy drink VOLTKAT. Speaks fluent marketing deck, cares more about style than wins, terrified of his regional director. |
| Rival (results banter, M1; full NPC in M3) | **Kenji "Static" Morrow** | Trash talker with a perfect car and a fragile ego. |

Later locations add their own casts (a rival team's sardonic engineer, a
family-restaurant sponsor who pays in small cheques and unconditional loyalty,
a retired champion running a tyre stall). Sponsors and teams are always
invented brands.

## Dialogue system

- The browser sends: character id, the player's message, recent turns, the
  NPC's memory summary of the player, and a **game snapshot** (money, car,
  installed parts, last race result, open deals, relationship level).
- The server builds the prompt: persona card + world rules + snapshot + the
  catalogue items this character may reference, and calls the model with
  streaming and **tools**.
- **Game actions are tools.** Examples: `quote_part`, `offer_discount`,
  `sell_part`, `install_part`, `offer_sponsorship`, `adjust_relationship`,
  `give_tip`. The model proposes an action; the server validates it against
  hard rules (price floors per character, catalogue membership, player funds,
  relationship gates) and returns an accepted or rejected result that the
  character then reacts to in voice.
- The client applies only server-validated actions, and re-validates against
  the save before mutating it. Purchases need an explicit player confirm.
- After a conversation ends, a short model call compresses it into the NPC's
  memory summary (a few sentences) stored in the save.
- With the mock provider, replies and tool calls are scripted per character so
  every story can be tested deterministically.

## Economy

- Currency is USD so real part prices mean something.
- Income: prize money by finishing position, sponsor payouts on objectives
  (finish top 3, no collisions, lead a lap, hit a top speed).
- Costs: parts at real list price (minus any haggled discount, bounded per
  seller), installation labour, entry fees, (M3) travel.
- Starting budget is tuned so the first upgrade is a real choice between, for
  example, tyres now or saving for suspension.

## Real cars and parts

- Starter cars for M1 (affordable enthusiast street cars; final three chosen
  when data is sourced): candidates are Mazda MX-5 Miata (NA), Honda Civic Si
  (EM1), Toyota Corolla GT-S (AE86), Nissan 240SX (S13), Volkswagen GTI (Mk2).
- Every car and part record carries its source and the date it was checked.
  **Nothing in the catalogue is typed from memory.** See the
  `data/real-world-catalogue` standard.
- Names and specs are used factually. No logos, badges, liveries or official
  imagery. Sprites are original pixel art that reads as the body style.

## World and progression

- Six locations in tiers: Harbour District, Pinewood, Dustbowl, Neon City,
  Glacier Ridge, Grand Autodrome. A top-three finish at one opens the next.
  Travel costs money; prize money and the rivals' cars step up with the tier.
- The paddock travels: Mags, Teo, Dee Dee and Sterling are at every location
  (trailer, truck, van, tent). Each away location adds one local character:
  Birdie Lindqvist (Pinewood diner), Lupe Zamora (Dustbowl car dealer), Juno
  Park (Neon City arcade and pirate radio), Olav "Grandpa Frost" Henriksen
  (Glacier Ridge waffle hut), Dame Renata Voss (Autodrome clubhouse).
- Faster cars (Mustang GT, Corvette, Viper RT/10) are bought from Lupe with a
  trade-in: 70% of the current car's price plus half the list price of fitted
  parts, which go with the old car.
- Nitrous is an arcade boost: up to three shots, bought from Dee Dee at an
  invented house price, fired with N for a few seconds of extra shove. Glacier
  Ridge is icy: grip there is well below dry asphalt.

## Tone

Warm, funny, a bit scruffy. Late-night car-meet energy rather than corporate
motorsport. The cast teases the player but is on their side (except Kenji).

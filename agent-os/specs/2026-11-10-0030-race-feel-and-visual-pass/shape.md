# Race Feel and Visual Pass — Shaping Notes

## Scope

The owner played the M1 slice and asked for better graphics and physics,
saying the prototype is directionally correct. This pass keeps the design and
raises the quality of both halves:

- **Physics:** weightier steering, a real grip limit with understeer and
  slides, drivetrain character (FWD pushes, RWD can power-slide), a
  handbrake, slipstream, gears and revs, rumble strips and off-road drag,
  contact that shoves both cars.
- **Race visuals:** dusk sky with sun, clouds and parallax layers; ground
  that changes with the section (promenade, docks, town, cliffs, a bridge
  over water); detailed car sprites with steering and brake lights; richer
  scenery and a start gantry; tyre smoke, dust and speed lines; a HUD with
  tachometer, gear, slipstream indicator and lap progress.
- **Town visuals:** a livelier street (sky, sea, boats, lit windows, lamp
  glow, palms), more detailed characters with walk animation, drawn
  portraits in conversations.

## Decisions

- Still retro pseudo-3D at 384x216 and still generated placeholder art:
  textures are drawn in code on canvases, keyed so real art can replace them.
- Physics stays pure, fixed-step and seeded. Existing unit tests keep
  passing unchanged; new behaviour gets new tests.
- No change to the economy, catalogue, dialogue or save format.
- Pulls the "race handling pass" forward from M2 and part of M4's art pass.
  Damage, wear and final art stay where they are on the roadmap.
- Story tests move to their own ports (5273/8887) so they never disturb a
  running game.

## Standards Applied

- game/architecture — rules pure, scenes thin, assets by key
- testing/game-testing — hooks, fixtures, story tests on the mock provider

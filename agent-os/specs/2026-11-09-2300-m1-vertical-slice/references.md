# References for M1 Vertical Slice

## Similar Implementations

Greenfield project: there is no existing code to reference.

### agent-os sample app

- **Location:** `examples/sample-app/` in https://github.com/elmunoz42/agent-os
- **Relevance:** shows the expected shape of stories, `testing.yml`, a
  verification run report and story-tagged Playwright tests.
- **Key patterns:** `tests/e2e/stories/US-###.spec.ts`, `@US-###` and `@demo`
  tags, fixtures file.

## Technique notes

- Pseudo-3D roads are a well documented technique: the track is a list of
  segments, each projected from world to screen by perspective division, drawn
  back to front, with curves applied as an accumulating horizontal offset and
  hills as segment height. Sprites scale with the same projection. Implement
  it from the technique; do not copy another game's tracks, art or layout.

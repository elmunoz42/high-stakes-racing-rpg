# Agent Instructions

<!-- agent-os:start -->
## Agent OS

This project uses [Agent OS](https://github.com/elmunoz42/agent-os) (fork 3.1). This block is managed by the installer; edit outside the markers.

- `agent-os/standards/`: coding standards. Use the inject-standards skill to pull relevant ones into context (index in `agent-os/standards/index.yml`).
- `agent-os/product/`: mission, roadmap, tech stack.
- `agent-os/specs/`: shaped specs, one folder per feature.
- `agent-os/user-stories/`: long lived user stories with acceptance criteria (index in `agent-os/user-stories/index.yml`). Status page: `python3 .agents/skills/verify-stories/scripts/stories_report.py` writes `agent-os/user-stories/report.html`.
- `agent-os/testing.yml`: testing level (demo or production), how to start the app, and how to run unit and e2e tests.

Skills (in `.agents/skills/`, linked into `.claude/skills/`): plan-product, shape-spec, discover-standards, inject-standards, index-standards, write-user-stories, verify-stories, prd-to-stories, plus bm-prd-creator and security-audit if installed.

Rules for agents:
- When a change affects user-facing behavior, find the related stories in `agent-os/user-stories/index.yml` and keep them accurate.
- Before declaring a feature, spec, or milestone done, run the verify-stories skill for its stories. A story counts as verified only when its acceptance criteria passed in a real browser and are covered by committed tests.
- When building from a PRD milestone (`_build_plan/milestones/*/prompt.md`), run verify-stories for that milestone before writing `milestone-log.md`, and include the verification result in the log.
- Security: if the security-audit skill is installed and the level is production, run a focused security review (its guidance mode) of the changed code before declaring work done, and turn each fixed finding into an `(edge)` acceptance criterion. Run its full audit only when the user asks. At any level, never commit secrets or keys. Details: `.agents/skills/write-user-stories/references/testing-levels.md`.
- Testing level: read `level:` in `agent-os/testing.yml`. Demo means happy path stories and tests, fast, moderate checks. Production means edge cases and full regression tests. If it is empty, ask the user once which applies and save the answer there before writing stories or tests.
- Never edit a story to match a bug. Report the failure instead.
<!-- agent-os:end -->

## Project: Racing RPG

A browser game that is half retro pseudo-3D street-car racer and half
side-scrolling RPG whose characters talk through LLM inference.

Read in this order before doing anything:

1. `agent-os/product/mission.md`, `game-design.md`, `tech-stack.md`, `roadmap.md`
2. `agent-os/standards/` (four short files, indexed in `index.yml`)
3. The current spec: `agent-os/specs/2026-11-09-2300-m1-vertical-slice/plan.md`

Current state: M0 done (docs, standards, spec, stories). No game code yet.
Next: M1, starting at Task 2 of the spec plan, on branch `m1-vertical-slice`.

Project rules:

- RPG immersion and racing carry equal weight. Do not cut character work to
  ship racing features, or the reverse.
- Never enter car specs or part prices from memory. Source them and record
  `source_url` and `checked_on`.
- The LLM proposes game actions; validators decide. Free text never changes
  money, inventory or stats.
- Tests never call the real model. Use `LLM_PROVIDER=mock`.
- Game characters run on OpenAI (model GPT-6 Luna). Read the current OpenAI API
  docs before writing SDK code; do not write model IDs or API details from memory.
- Original game: no names, tracks, characters, art, music or UI taken from
  existing games. No manufacturer logos or official imagery.
- Never commit `.env` or any key.
- Commit after each plan task. Update the roadmap and this section when a
  milestone closes.

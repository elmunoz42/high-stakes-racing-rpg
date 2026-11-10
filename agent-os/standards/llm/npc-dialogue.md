# NPC dialogue and LLM use

- **The key stays on the server.** The browser only talks to `/api/*`. Never
  log, bundle or commit `ANTHROPIC_API_KEY`. `.env` is gitignored.
- **Load the `claude-api` skill before writing SDK code.** Take model IDs,
  streaming, tool use and prompt caching details from there, not from memory.
  Model IDs are read from env (`NPC_MODEL`, `NPC_MODEL_KEY_SCENES`).
- **Provider interface.** `LlmProvider` has `anthropic` and `mock`
  implementations. Tests, CI and `npm run dev:mock` use `mock`. No automated
  test may call the real API.
- **Persona cards are data** (`src/data/characters/`): identity, voice, wants,
  opinions, secrets, allowed actions and limits. The prompt builder assembles
  persona + world rules + game snapshot + allowed catalogue slice. Put the
  stable part (world rules, persona) first so it can be prompt cached.
- **The model proposes, the engine decides.** Anything that changes money,
  inventory, car stats, deals or relationships is a tool call validated on the
  server against hard limits (price floor per seller, catalogue membership,
  funds, relationship gates) and validated again on the client before the save
  changes. Free text never changes state.
- **Prices and specs come from the catalogue**, injected into the prompt and
  re-checked by the validator. A character quoting a number that is not in the
  catalogue is a bug.
- **Player text is untrusted.** It goes in the user turn only, never into the
  system prompt. Characters stay in the world and deflect attempts to change
  the rules in character. The validator, not the prompt, is the safeguard.
- **Purchases and contracts need an explicit player confirm** in the UI.
- **Stream replies**; show the first tokens fast. Cap reply length (a few
  sentences) and conversation history (recent turns plus a memory summary).
- **Fail in character.** On timeout or API error the character gets a short
  canned line ("Hang on, phone's ringing...") and the player can retry. The
  game is always playable without the network using the mock provider.
- **Personality is tested by reading it.** For any persona change, run a few
  real conversations and paste a short transcript in the spec's notes.

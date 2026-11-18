import type { ChatEvent, ChatRequest, SummariseRequest } from '../shared/dialogue.ts';
import { type Catalogue, findCharacter } from '../src/data/catalogue.ts';
import { buildContext, buildInstructions, toolsFor } from './prompt.ts';
import type { ConversationItem, LlmProvider } from './providers/types.ts';
import { handleToolCall } from './tools.ts';

const MAX_ROUNDS = 3;
const MAX_OUTPUT_TOKENS = 450;
export const CHAT_TIMEOUT_MS = 30_000;

/**
 * Runs one player message through a character: stream text, validate tool
 * calls, feed results back to the model so it can react, repeat.
 */
export async function runChat(
  req: ChatRequest,
  provider: LlmProvider,
  cat: Catalogue,
  emit: (e: ChatEvent) => void | Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  const persona = findCharacter(cat, req.characterId);
  if (!persona) {
    await emit({ type: 'error', message: 'Unknown character', fallback: '...' });
    return;
  }
  let state = req.state;
  const instructions = buildInstructions(persona, cat);
  const input: ConversationItem[] = [
    { kind: 'message', role: 'developer', text: buildContext(persona, state, cat) },
    ...req.history.map<ConversationItem>((t) => ({
      kind: 'message',
      role: t.role === 'player' ? 'user' : 'assistant',
      text: t.text,
    })),
    { kind: 'message', role: 'user', text: req.message },
  ];

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const calls: { callId: string; name: string; args: string }[] = [];
      let text = '';
      for await (const ev of provider.round(
        {
          instructions,
          input,
          tools: toolsFor(persona),
          cacheKey: `npc-${persona.id}`,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          meta: { persona, state },
        },
        signal,
      )) {
        if (ev.type === 'text') {
          text += ev.delta;
          await emit(ev);
        } else calls.push(ev);
      }
      if (text) input.push({ kind: 'message', role: 'assistant', text });
      if (!calls.length) break;
      for (const call of calls) {
        const outcome = handleToolCall(persona, call.name, call.args, state, cat);
        state = outcome.state;
        for (const e of outcome.events) await emit(e);
        input.push({ kind: 'tool_call', ...call });
        input.push({
          kind: 'tool_result',
          callId: call.callId,
          output: JSON.stringify(outcome.output),
        });
      }
      if (round === MAX_ROUNDS - 1) break;
      // Keep the reply flowing as one paragraph after an action.
      if (text && !/\s$/.test(text)) await emit({ type: 'text', delta: ' ' });
    }
    await emit({ type: 'done' });
  } catch (err) {
    const message = signal.aborted ? 'timeout' : err instanceof Error ? err.message : String(err);
    console.error(`[chat] ${persona.id}: ${message}`);
    await emit({ type: 'error', message, fallback: persona.fallbackLine });
  }
}

const SUMMARY_RULES = `You keep a character's private memory of a player in a racing RPG. Given the character and a conversation, write what the character will remember about the player next time: at most three short sentences, in the third person ("The player..."). Keep concrete facts (what they bought, asked for, promised, how they behaved, any nickname or running joke) and the character's feelings. No preamble.`;

export async function summarise(
  req: SummariseRequest,
  provider: LlmProvider,
  cat: Catalogue,
  signal: AbortSignal,
): Promise<string> {
  const persona = findCharacter(cat, req.characterId);
  if (!persona) throw new Error('Unknown character');
  const previous = req.state.memories[persona.id];
  const transcript = req.history
    .map((t) => `${t.role === 'player' ? 'Player' : persona.name}: ${t.text}`)
    .join('\n');
  const text = `Character: ${persona.name}, ${persona.roleTitle}. ${persona.pitch}
Previous memory: ${previous ?? 'none'}

Conversation:
${transcript}`;
  const out = await provider.complete(SUMMARY_RULES, text, signal);
  return out.trim().slice(0, 1200);
}

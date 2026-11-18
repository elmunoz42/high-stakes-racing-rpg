import { z } from 'zod';
import { GameState } from '../src/save/schema.ts';
import { GameAction } from './actions.ts';

/** Wire types between the browser and the dialogue server. */

export const MAX_MESSAGE_CHARS = 600;
export const MAX_HISTORY_TURNS = 24;

/** Sent instead of player text when the player walks up to a character. */
export const ARRIVAL_MESSAGE = '(The player walks in and comes over to you.)';

export const Turn = z.object({
  role: z.enum(['player', 'npc']),
  text: z.string().max(4000),
});
export type Turn = z.infer<typeof Turn>;

export const ChatRequest = z.object({
  characterId: z.string(),
  message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
  history: z.array(Turn).max(MAX_HISTORY_TURNS * 2),
  state: GameState,
});
export type ChatRequest = z.infer<typeof ChatRequest>;

export const SummariseRequest = z.object({
  characterId: z.string(),
  history: z
    .array(Turn)
    .min(1)
    .max(MAX_HISTORY_TURNS * 2),
  state: GameState,
});
export type SummariseRequest = z.infer<typeof SummariseRequest>;

/**
 * Proposals need the player's confirmation in the UI before the client
 * dispatches them. Immediate actions are applied by the client straight away
 * (after re-validating them).
 */
export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'proposal'; action: GameAction; label: string }
  | { type: 'applied'; action: GameAction; label: string }
  | { type: 'rejected'; tool: string; reason: string }
  | { type: 'tip'; topic: string; tip: string }
  | { type: 'quote'; partId: string }
  | { type: 'done' }
  | { type: 'error'; message: string; fallback: string };

export const ChatEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), delta: z.string() }),
  z.object({ type: z.literal('proposal'), action: GameAction, label: z.string() }),
  z.object({ type: z.literal('applied'), action: GameAction, label: z.string() }),
  z.object({ type: z.literal('rejected'), tool: z.string(), reason: z.string() }),
  z.object({ type: z.literal('tip'), topic: z.string(), tip: z.string() }),
  z.object({ type: z.literal('quote'), partId: z.string() }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string(), fallback: z.string() }),
]);

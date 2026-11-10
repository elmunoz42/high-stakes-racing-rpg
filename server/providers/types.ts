import type { Persona } from '../../src/data/schema.ts';
import type { GameState } from '../../src/save/schema.ts';

/** One item in the conversation sent to a model. */
export type ConversationItem =
  | { kind: 'message'; role: 'developer' | 'user' | 'assistant'; text: string }
  | { kind: 'tool_call'; callId: string; name: string; args: string }
  | { kind: 'tool_result'; callId: string; output: string };

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface RoundRequest {
  /** Stable prefix: world rules and persona. Put first so it can be cached. */
  instructions: string;
  input: ConversationItem[];
  tools: ToolDef[];
  cacheKey: string;
  maxOutputTokens: number;
  /** Context for the mock provider only; real providers ignore it. */
  meta: { persona: Persona; state: GameState };
}

export type RoundEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_call'; callId: string; name: string; args: string };

/** A model that can run one round of a conversation: text and tool calls. */
export interface LlmProvider {
  readonly name: string;
  round(req: RoundRequest, signal: AbortSignal): AsyncIterable<RoundEvent>;
  /** Plain completion for memory summaries. */
  complete(instructions: string, text: string, signal: AbortSignal): Promise<string>;
}

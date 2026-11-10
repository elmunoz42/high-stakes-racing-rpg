import OpenAI from 'openai';
import type { ResponseInputItem } from 'openai/resources/responses/responses';
import type { ConversationItem, LlmProvider, RoundEvent, RoundRequest } from './types.ts';

/**
 * OpenAI provider (Responses API, streaming, function calling).
 * Model: GPT-6 Luna, API id `gpt-6-luna` (developers.openai.com, checked 2026-11-09).
 * The model id comes from NPC_MODEL so it can change without code changes.
 */

type Effort = 'none' | 'low' | 'medium' | 'high';

export function createOpenAIProvider(): LlmProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new Error('OPENAI_API_KEY is not set. Add it to .env, or run with LLM_PROVIDER=mock.');
  const model = process.env.NPC_MODEL || 'gpt-6-luna';
  const effort = (process.env.NPC_REASONING_EFFORT as Effort) || 'low';
  const client = new OpenAI({ apiKey, maxRetries: 1 });

  const toInput = (items: ConversationItem[]): ResponseInputItem[] =>
    items.map((i): ResponseInputItem => {
      if (i.kind === 'message') return { role: i.role, content: i.text, type: 'message' };
      if (i.kind === 'tool_call')
        return { type: 'function_call', call_id: i.callId, name: i.name, arguments: i.args };
      return { type: 'function_call_output', call_id: i.callId, output: i.output };
    });

  return {
    name: `openai:${model}`,

    async *round(req: RoundRequest, signal: AbortSignal): AsyncIterable<RoundEvent> {
      const stream = await client.responses.create(
        {
          model,
          instructions: req.instructions,
          input: toInput(req.input),
          tools: req.tools.map((t) => ({
            type: 'function' as const,
            name: t.name,
            description: t.description,
            parameters: t.parameters,
            strict: true,
          })),
          stream: true,
          store: false,
          max_output_tokens: req.maxOutputTokens,
          reasoning: { effort },
          prompt_cache_key: req.cacheKey,
        },
        { signal },
      );
      for await (const ev of stream) {
        if (ev.type === 'response.output_text.delta') yield { type: 'text', delta: ev.delta };
        else if (ev.type === 'response.output_item.done' && ev.item.type === 'function_call')
          yield {
            type: 'tool_call',
            callId: ev.item.call_id,
            name: ev.item.name,
            args: ev.item.arguments,
          };
        else if (ev.type === 'response.failed')
          throw new Error(ev.response.error?.message ?? 'response failed');
        else if (ev.type === 'error') throw new Error(ev.message);
      }
    },

    async complete(instructions: string, text: string, signal: AbortSignal): Promise<string> {
      const res = await client.responses.create(
        {
          model,
          instructions,
          input: text,
          store: false,
          max_output_tokens: 300,
          reasoning: { effort: 'none' },
        },
        { signal },
      );
      return res.output_text;
    },
  };
}

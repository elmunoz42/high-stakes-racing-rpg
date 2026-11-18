import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { ChatRequest, SummariseRequest, type ChatEvent } from '../shared/dialogue.ts';
import { CATALOGUE, findCharacter } from '../src/data/catalogue.ts';
import { CHAT_TIMEOUT_MS, runChat, summarise } from './dialogue.ts';
import { createMockProvider } from './providers/mock.ts';
import { createOpenAIProvider } from './providers/openai.ts';
import type { LlmProvider } from './providers/types.ts';

export function providerFromEnv(): LlmProvider {
  return (process.env.LLM_PROVIDER ?? 'openai') === 'mock'
    ? createMockProvider()
    : createOpenAIProvider();
}

export function createApp(getProvider: () => LlmProvider = memo(providerFromEnv)): Hono {
  const app = new Hono();

  app.get('/api/health', (c) =>
    c.json({ ok: true, provider: process.env.LLM_PROVIDER ?? 'openai' }),
  );

  app.post('/api/chat', async (c) => {
    const parsed = ChatRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      return c.json({ error: 'Invalid request', issues: parsed.error.issues.slice(0, 5) }, 400);
    const req = parsed.data;
    const persona = findCharacter(CATALOGUE, req.characterId);
    if (!persona) return c.json({ error: 'Unknown character' }, 404);

    return streamSSE(c, async (stream) => {
      const send = (e: ChatEvent) => stream.writeSSE({ data: JSON.stringify(e) });
      let provider: LlmProvider;
      try {
        provider = getProvider();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[chat] provider unavailable: ${message}`);
        await send({ type: 'error', message, fallback: persona.fallbackLine });
        return;
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), CHAT_TIMEOUT_MS);
      stream.onAbort(() => ctrl.abort());
      try {
        await runChat(req, provider, CATALOGUE, send, ctrl.signal);
      } finally {
        clearTimeout(timer);
      }
    });
  });

  app.post('/api/summarise', async (c) => {
    const parsed = SummariseRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CHAT_TIMEOUT_MS);
    try {
      const summary = await summarise(parsed.data, getProvider(), CATALOGUE, ctrl.signal);
      return c.json({ summary });
    } catch (err) {
      console.error('[summarise]', err instanceof Error ? err.message : err);
      return c.json({ error: 'Summary failed' }, 502);
    } finally {
      clearTimeout(timer);
    }
  });

  return app;
}

function memo<T>(fn: () => T): () => T {
  let v: T | undefined;
  return () => (v ??= fn());
}

import { type ChatEvent, ChatEventSchema, type Turn } from '../../shared/dialogue.ts';
import type { GameState } from '../save/schema.ts';

/** Browser client for the dialogue server. The API key never reaches the browser. */

export async function streamChat(
  body: { characterId: string; message: string; history: Turn[]; state: GameState },
  onEvent: (e: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`chat failed: HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try {
          const parsed = ChatEventSchema.safeParse(JSON.parse(line.slice(5).trim()));
          if (parsed.success) onEvent(parsed.data as ChatEvent);
          else console.warn('[chat] ignored malformed event', parsed.error.issues[0]);
        } catch {
          console.warn('[chat] ignored unparsable event');
        }
      }
    }
  }
}

export async function summariseConversation(
  characterId: string,
  history: Turn[],
  state: GameState,
): Promise<string | null> {
  try {
    const res = await fetch('/api/summarise', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ characterId, history, state }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { summary?: string };
    return data.summary?.trim() || null;
  } catch {
    return null;
  }
}

import { describe, expect, it } from 'vitest';
import { createApp } from '../../server/app.ts';

describe('api', () => {
  it('reports health', async () => {
    const res = await createApp().request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});

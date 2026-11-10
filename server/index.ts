import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';

if (existsSync('.env')) loadEnvFile('.env');

const port = Number(process.env.API_PORT ?? 8787);
const app = createApp();
serve({ fetch: app.fetch, port }, (info) => {
  console.log(
    `[api] listening on http://localhost:${info.port} (provider: ${process.env.LLM_PROVIDER ?? 'openai'})`,
  );
});

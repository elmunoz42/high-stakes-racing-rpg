import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 8787}` },
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
});

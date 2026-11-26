import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'happy-dom', include: ['test/**/*.test.ts?(x)'] },
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
});

import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts?(x)'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'lcov'],
      include: ['lib/**', 'app/**', 'components/**', 'proxy.ts', 'instrumentation.ts'],
      // Sin lógica que probar: el emblema en base64 y los marcadores de pantalla (las pantallas se cubren con sus propias pruebas)
      exclude: ['lib/mfa/email-logo.ts', 'app/**/page.tsx', 'app/layout.tsx', 'components/ui/demo.tsx'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
});

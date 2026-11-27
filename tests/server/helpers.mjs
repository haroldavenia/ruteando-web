/** Utilidades para levantar mock-api y la app web en puertos libres (FND-001/FND-002). */
import { createRequire } from 'node:module';
import { createMockApi } from '../mock-api/server.mjs';

const require = createRequire(import.meta.url);
const { createApp } = require('../../server/app.js');

export function listen(server) {
  return new Promise((resolve) => {
    const s = server.listen(0, '127.0.0.1', () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}` }));
  });
}

export function shut(server) {
  return new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}

export async function startStack(env = {}) {
  const mock = createMockApi();
  const m = await listen(mock.server);
  let w;
  try {
    const app = createApp({ BACKEND_URL: m.url, ...env });
    w = await listen(app);
  } catch (err) {
    await shut(m.server);
    throw err;
  }
  return {
    mock, mockUrl: m.url, webUrl: w.url,
    async close() {
      await Promise.all([shut(w.server), shut(m.server)]);
    },
  };
}

// Genera las capturas del manifiesto (ng-ruteando/src/assets/screenshots): la interfaz de instalación enriquecida de la PWA las pide,
// una `wide` (escritorio) y una `narrow` (móvil). Captura la pantalla de acceso en inglés y en tema claro, con tamaño exacto.
// Usa Chrome sin interfaz y su protocolo de depuración (WebSocket nativo de Node; CHROME_BIN o la ruta habitual).
// Uso: con la aplicación sirviéndose (p. ej. `pnpm run build:web && pnpm start`): node scripts/generate-pwa-screenshots.mjs [http://localhost:3000]
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');
const chrome = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = fileURLToPath(new URL('../ng-ruteando/src/assets/screenshots/', import.meta.url));
const PORT = 9333;
const SHOTS = [
  { file: 'wide-login.png', width: 1280, height: 720, mobile: false },
  { file: 'narrow-login.png', width: 540, height: 960, mobile: true },
];

mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'pwa-shots-'));
const child = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function pageSocket() {
  for (let i = 0; i < 40; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = pages.find((p) => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* Chrome aún arrancando */
    }
    await sleep(250);
  }
  throw new Error('Chrome no respondió en el puerto de depuración');
}

try {
  const ws = new WebSocket(await pageSocket());
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    } else events.push(message.method);
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      pending.set(n, resolve);
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await send('Page.enable');
  for (const shot of SHOTS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: 1,
      mobile: shot.mobile,
    });
    await send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: 'light' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });
    events.length = 0;
    await send('Page.navigate', { url: `${base}/acceso` });
    for (let i = 0; i < 80 && !events.includes('Page.loadEventFired'); i++) await sleep(250);
    await sleep(3500); // tipografías (Google Fonts) y arranque de Angular
    const reply = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(out, shot.file), Buffer.from(reply.result.data, 'base64'));
    console.log('✔', shot.file, `${shot.width}x${shot.height}`);
  }
  ws.close();
} finally {
  child.kill();
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* Windows puede tener el perfil abierto un instante */
  }
}

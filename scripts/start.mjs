// Arranque de producción de ruteando-web (lo usan `pnpm start`, Render y la imagen de Docker).
//
// Con GATEWAY_MODE=mock levanta antes el gateway simulado (scripts/mock-gateway.mjs, dentro de este mismo proceso, en 127.0.0.1) y
// después la aplicación: Next ya no lo hace por su cuenta (lo hacía el servidor Express retirado). Con el gateway real solo arranca
// la aplicación.
//
//   node scripts/start.mjs                          -> `next start` desde next-ruteando/ (después de `pnpm run build`)
//   node scripts/start.mjs next-ruteando/server.js  -> el servidor standalone de la imagen de Docker
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (process.env.GATEWAY_MODE === 'mock') {
  // El simulado escucha en el puerto de MOCK_GATEWAY_PORT (4010) y la aplicación lo busca en 127.0.0.1: que no quede abierto al exterior
  process.env.MOCK_GATEWAY_HOST ||= '127.0.0.1';
  if (!process.env.MOCK_GATEWAY_PASSWORD) {
    console.warn(
      'AVISO: GATEWAY_MODE=mock sin MOCK_GATEWAY_PASSWORD: los tres usuarios de prueba entran con «demo1234». ' +
        'Solo vale en tu máquina: con un SITE_URL público el servidor se niega a arrancar (lib/config.ts).'
    );
  }
  await import('./mock-gateway.mjs');
}

const entry = process.argv[2]?.startsWith('-') ? undefined : process.argv[2];
if (entry) {
  // Standalone: el propio server.js escucha en PORT/HOSTNAME y atiende SIGTERM
  await import(pathToFileURL(resolve(root, entry)).href);
} else {
  const next = join(root, 'next-ruteando/node_modules/next/dist/bin/next');
  if (!existsSync(next)) {
    console.error(
      'No se encuentra Next.js: ejecuta `pnpm install --frozen-lockfile` y `pnpm run build` antes de arrancar.'
    );
    process.exit(1);
  }
  const child = spawn(process.execPath, [next, 'start', ...process.argv.slice(entry ? 3 : 2)], {
    cwd: join(root, 'next-ruteando'),
    stdio: 'inherit',
  });
  // El gestor del servidor (Render, Docker) manda SIGTERM a este proceso: se reenvía para que Next cierre ordenadamente
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

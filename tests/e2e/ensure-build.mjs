#!/usr/bin/env node
/**
 * Compila la SPA con Gulp si app/js/app.js no existe o es más antiguo que master/js (FND-001 CA-5/CA-10).
 * E2E_SKIP_BUILD=1 la omite. En CI se instala bower y las dependencias de master/ antes (ci.yml, job e2e).
 */
import { existsSync, statSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function newest(dir) {
  let max = 0;
  if (!existsSync(dir)) return max;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    max = Math.max(max, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }
  return max;
}

export function needsBuild(rootDir = root) {
  const out = path.join(rootDir, 'app', 'js', 'app.js');
  if (!existsSync(out)) return true;
  const sources = Math.max(newest(path.join(rootDir, 'master', 'js')), newest(path.join(rootDir, 'master', 'jade')));
  return sources > statSync(out).mtimeMs;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.env.E2E_SKIP_BUILD === '1' || !needsBuild()) {
    console.log('ensure-build: app/ al día');
  } else {
    console.log('ensure-build: compilando con Gulp (master/) …');
    const r = spawnSync('npx', ['gulp', 'build'], { cwd: path.join(root, 'master'), stdio: 'inherit', shell: process.platform === 'win32' });
    process.exitCode = r.status ?? 1;
  }
}

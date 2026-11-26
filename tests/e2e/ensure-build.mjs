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

/** Archivos de configuración del build: si cambian, app/ también queda desactualizada. */
export const BUILD_CONFIG = ['gulpfile.js', 'gulp-node-compat.cjs', 'bower.json', 'vendor.json', 'vendor.base.json'];

/** Carpetas fuente de master/ que generan app/ (scripts, vistas, i18n y estilos). */
export const BUILD_SOURCES = ['js', 'jade', 'i18n', 'less', 'sass'];

/** Artefactos sin los que la SPA no arranca: si falta alguno, se recompila aunque app.js sea reciente. */
export const REQUIRED_OUTPUTS = ['app/js/app.js', 'app/js/base.js', 'index.html', 'vendor/bootstrap/js/bootstrap.js', 'app/js/toastr.js', 'app/css/toastr.css',
  'app/css/app.css', 'app/css/bootstrap.css', 'app/views/pages/login2.html', 'app/i18n/es.json', 'app/i18n/en.json', 'app/i18n/es_AR.json'];

/** Lo escribe `gulp build` al terminar sin errores (master/gulpfile.js): marca cuándo se compiló todo. */
export const BUILD_STAMP = 'app/.build-stamp';

export function needsBuild(rootDir = root) {
  if ([...REQUIRED_OUTPUTS, BUILD_STAMP].some((f) => !existsSync(path.join(rootDir, f)))) return true;
  const built = statSync(path.join(rootDir, BUILD_STAMP)).mtimeMs;
  const config = BUILD_CONFIG.map((f) => path.join(rootDir, 'master', f)).filter((f) => existsSync(f)).map((f) => statSync(f).mtimeMs);
  const sources = Math.max(...BUILD_SOURCES.map((d) => newest(path.join(rootDir, 'master', d))), ...config);
  return sources > built;
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

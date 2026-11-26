import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { needsBuild, newest, REQUIRED_OUTPUTS } from '../e2e/ensure-build.mjs';

/** Crea todos los artefactos de salida de un build, con fecha `when`. */
function writeOutputs(root, when = new Date()) {
  for (const f of REQUIRED_OUTPUTS) {
    mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    writeFileSync(path.join(root, f), '1');
    utimesSync(path.join(root, f), when, when);
  }
}

test('[FND-001 CA-10] ensure-build compila si falta app/js/app.js o si master/ es más nuevo', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'build-'));
  mkdirSync(path.join(root, 'master', 'js', 'modules'), { recursive: true });
  writeFileSync(path.join(root, 'master', 'js', 'modules', 'a.js'), '1');
  assert.equal(needsBuild(root), true);
  writeOutputs(root);
  const past = new Date(Date.now() - 60000);
  utimesSync(path.join(root, 'master', 'js', 'modules', 'a.js'), past, past);
  assert.equal(needsBuild(root), false);
  utimesSync(path.join(root, 'master', 'js', 'modules', 'a.js'), new Date(Date.now() + 60000), new Date(Date.now() + 60000));
  assert.equal(needsBuild(root), true);
  assert.equal(newest(path.join(root, 'nope')), 0);
});

test('[FND-001 CA-10] ensure-build recompila si cambia la configuración del build (gulpfile)', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'build-'));
  mkdirSync(path.join(root, 'master', 'js'), { recursive: true });
  const past = new Date(Date.now() - 60000);
  writeFileSync(path.join(root, 'master', 'js', 'a.js'), '1');
  writeFileSync(path.join(root, 'master', 'gulpfile.js'), '1');
  utimesSync(path.join(root, 'master', 'js', 'a.js'), past, past);
  utimesSync(path.join(root, 'master', 'gulpfile.js'), past, past);
  writeOutputs(root);
  assert.equal(needsBuild(root), false);
  const future = new Date(Date.now() + 60000);
  utimesSync(path.join(root, 'master', 'gulpfile.js'), future, future);
  assert.equal(needsBuild(root), true);
});

test('[FND-001 CA-10] ensure-build recompila si falta un artefacto (vendor_fixed, index.html) aunque app.js sea reciente', () => {
  for (const missingFile of ['vendor/bootstrap/js/bootstrap.js', 'app/js/toastr.js', 'index.html']) {
    const root = mkdtempSync(path.join(tmpdir(), 'build-'));
    mkdirSync(path.join(root, 'master', 'js'), { recursive: true });
    const past = new Date(Date.now() - 60000);
    writeFileSync(path.join(root, 'master', 'js', 'a.js'), '1');
    utimesSync(path.join(root, 'master', 'js', 'a.js'), past, past);
    writeOutputs(root);
    assert.equal(needsBuild(root), false);
    rmSync(path.join(root, missingFile));
    assert.equal(needsBuild(root), true, missingFile);
  }
});

test('[FND-001 CA-10] ensure-build recompila si cambian i18n o estilos', () => {
  for (const dir of ['i18n', 'less']) {
    const root = mkdtempSync(path.join(tmpdir(), 'build-'));
    mkdirSync(path.join(root, 'master', dir), { recursive: true });
    const past = new Date(Date.now() - 60000);
    writeFileSync(path.join(root, 'master', dir, 'x'), '1');
    utimesSync(path.join(root, 'master', dir, 'x'), past, past);
    writeOutputs(root);
    assert.equal(needsBuild(root), false);
    const future = new Date(Date.now() + 60000);
    utimesSync(path.join(root, 'master', dir, 'x'), future, future);
    assert.equal(needsBuild(root), true, dir);
  }
});

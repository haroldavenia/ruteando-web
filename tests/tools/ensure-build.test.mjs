import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { needsBuild, newest } from '../e2e/ensure-build.mjs';

test('[FND-001 CA-10] ensure-build compila si falta app/js/app.js o si master/ es más nuevo', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'build-'));
  mkdirSync(path.join(root, 'master', 'js', 'modules'), { recursive: true });
  writeFileSync(path.join(root, 'master', 'js', 'modules', 'a.js'), '1');
  assert.equal(needsBuild(root), true);
  mkdirSync(path.join(root, 'app', 'js'), { recursive: true });
  writeFileSync(path.join(root, 'app', 'js', 'app.js'), '1');
  const past = new Date(Date.now() - 60000);
  utimesSync(path.join(root, 'master', 'js', 'modules', 'a.js'), past, past);
  assert.equal(needsBuild(root), false);
  utimesSync(path.join(root, 'master', 'js', 'modules', 'a.js'), new Date(Date.now() + 60000), new Date(Date.now() + 60000));
  assert.equal(needsBuild(root), true);
  assert.equal(newest(path.join(root, 'nope')), 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { merge, main } from '../merge-lcov.mjs';

test('merge concatena registros e ignora vacíos', () => {
  assert.equal(merge(['SF:a\nend_of_record\n', '', 'SF:b\nend_of_record']), 'SF:a\nend_of_record\nSF:b\nend_of_record\n');
});

test('main escribe la salida con las entradas existentes y valida argumentos', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lcov-'));
  writeFileSync(path.join(dir, 'a.info'), 'SF:a\nDA:1,1\nend_of_record\n');
  const out = [];
  const code = main([path.join(dir, 'x', 'all.info'), path.join(dir, 'a.info'), path.join(dir, 'nope.info')], { out: (t) => out.push(t) });
  assert.equal(code, 0);
  assert.match(out[0], /1\/2 archivos/);
  assert.equal(readFileSync(path.join(dir, 'x', 'all.info'), 'utf8'), 'SF:a\nDA:1,1\nend_of_record\n');
  assert.equal(main([], { out: () => {} }), 2);
});

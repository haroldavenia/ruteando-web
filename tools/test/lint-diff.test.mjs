import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterMessages, format, main } from '../lint-diff.mjs';

const RESULTS = [
  { filePath: '/repo/src/a.js', messages: [
    { line: 2, ruleId: 'no-var', message: 'var', severity: 2 },
    { line: 9, ruleId: 'no-var', message: 'var vieja', severity: 2 },
    { fatal: true, message: 'Parsing error', severity: 2 },
  ] },
  { filePath: '/repo/src/b.js', messages: [{ line: 1, ruleId: 'eqeqeq', message: 'eq', severity: 1 }] },
  { filePath: '/repo/src/c.js' },
];
const DIFF_TEXT = '+++ b/src/a.js\n@@ -0,0 +2,1 @@\n+var x;\n';

test('filterMessages separa diff y heredado', () => {
  const diff = new Map([['src/a.js', new Set([2])]]);
  const res = filterMessages(RESULTS, diff, '/repo');
  assert.deepEqual(res.inDiff.map((m) => [m.file, m.line, m.rule]), [['src/a.js', 2, 'no-var'], ['src/a.js', 0, 'parse']]);
  assert.equal(res.legacy, 2);
  const txt = format(res);
  assert.match(txt, /src\/a\.js:2 {2}error/);
  assert.match(txt, /2 heredado/);
  assert.match(format({ inDiff: [{ file: 'b.js', line: 1, rule: 'r', message: 'm', severity: 1 }], legacy: 0 }), /warning/);
});

test('main: falla con problemas en el diff y pasa sin ellos', () => {
  const deps = (results) => ({ git: () => DIFF_TEXT, readText: () => JSON.stringify(results) });
  const out = [];
  const io = { out: (t) => out.push(t), err: (t) => out.push(t) };
  assert.equal(main(['--report', 'r.json', '--base', 'main', '--root', '/repo'], io, deps(RESULTS)), 1);
  assert.equal(main(['--report', 'r.json', '--base', 'main', '--root', '/repo'], io, deps([{ filePath: '/repo/src/a.js', messages: [{ line: 9, ruleId: 'no-var', message: 'x', severity: 2 }] }])), 0);
  assert.match(out.join(''), /1 heredado/);
});

test('main: errores de argumentos y reporte', () => {
  const err = [];
  const io = { out: () => {}, err: (t) => err.push(t) };
  assert.equal(main(['--nope', 'x'], io), 2);
  assert.equal(main(['--report'], io), 2);
  assert.equal(main(['--report', 'r.json'], io), 2);
  assert.equal(main(['--report', 'r.json', '--base', 'main'], io, { readText: () => '{malo' }), 2);
  assert.match(err.join(''), /inválido[\s\S]*faltan[\s\S]*ilegible/);
});

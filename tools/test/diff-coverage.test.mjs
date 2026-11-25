import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  normalizePath, toRelative, parseLcov, parseUnifiedDiff, isCountableLine,
  computeDiffCoverage, formatMarkdown, parseArgs, run, main,
} from '../diff-coverage.mjs';

const LCOV = [
  'TN:', 'SF:/repo/src/a.js', 'DA:1,1', 'DA:2,0', 'DA:3,4', 'end_of_record',
  'SF:/repo/src/b.test.js', 'DA:1,1', 'end_of_record',
  'SF:/repo/src/a.js', 'DA:2,3', 'DA:x,1', 'end_of_record',
].join('\n');

const DIFF = [
  'diff --git a/src/a.js b/src/a.js',
  '--- a/src/a.js',
  '+++ b/src/a.js',
  '@@ -1,0 +1,3 @@',
  '+const a = 1;',
  '+const b = 2;',
  '+',
  'diff --git a/src/new.js b/src/new.js',
  '--- /dev/null',
  '+++ b/src/new.js',
  '@@ -0,0 +1,4 @@',
  '+// comentario',
  '+function f() {',
  '+  return 1;',
  '+}',
  'diff --git a/src/gone.js b/src/gone.js',
  '--- a/src/gone.js',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-x',
  'diff --git a/README.md b/README.md',
  '--- a/README.md',
  '+++ b/README.md',
  '@@ -3,1 +3,2 @@',
  ' contexto',
  '+texto',
].join('\n');

test('normalizePath y toRelative', () => {
  assert.equal(normalizePath('.\\src\\a.js'), 'src/a.js');
  assert.equal(toRelative('/repo/src/a.js', '/repo/'), 'src/a.js');
  assert.equal(toRelative('src/a.js', '/otro'), 'src/a.js');
  assert.equal(toRelative('/repo/src/a.js', 'C:\\repo'), 'src/a.js'); // root resuelto en Windows
  assert.equal(toRelative('c:\\repo\\src\\a.js', 'C:\\repo'), 'src/a.js'); // unidad en minúscula
});

test('parseLcov suma hits de registros repetidos e ignora basura', () => {
  const m = parseLcov(LCOV + '\nDA:9,9', '/repo');
  assert.deepEqual([...m.get('src/a.js').entries()], [[1, 1], [2, 3], [3, 4]]);
  assert.ok(m.has('src/b.test.js'));
});

test('parseUnifiedDiff detecta líneas añadidas y omite borrados', () => {
  const d = parseUnifiedDiff(DIFF);
  assert.deepEqual([...d.get('src/a.js')], [1, 2, 3]);
  assert.deepEqual([...d.get('src/new.js')], [1, 2, 3, 4]);
  assert.deepEqual([...d.get('README.md')], [4]);
  assert.equal(d.has('src/gone.js'), false);
});

test('isCountableLine', () => {
  assert.equal(isCountableLine('  return 1;'), true);
  for (const l of ['', '   ', '// c', '/* c', ' * c', '*/', '}', '});', undefined]) {
    assert.equal(isCountableLine(l), false, String(l));
  }
});

test('computeDiffCoverage: archivo sin LCOV cuenta como no cubierto', () => {
  const res = computeDiffCoverage({
    lcov: parseLcov(LCOV, '/repo'),
    diff: parseUnifiedDiff(DIFF),
    readSource: (f) => (f === 'src/new.js' ? '// comentario\nfunction f() {\n  return 1;\n}\n' : null),
  });
  // a.js: líneas 1-3 instrumentadas y cubiertas.
  // new.js: 2 líneas contables (2 y 3), sin cubrir; comentario y "}" no cuentan.
  assert.equal(res.covered, 3);
  assert.equal(res.total, 5);
  assert.equal(res.pct, 60);
  assert.deepEqual(res.uncovered, [{ file: 'src/new.js', line: 2 }, { file: 'src/new.js', line: 3 }]);
});

test('computeDiffCoverage: excluye pruebas y reporta líneas en cero', () => {
  const lcov = parseLcov('SF:x.js\nDA:1,0\nDA:2,1\nend_of_record\nSF:t/x.test.js\nDA:1,0\nend_of_record');
  const diff = new Map([['x.js', new Set([1, 2])], ['t/x.test.js', new Set([1])], ['vacio.js', new Set()]]);
  const res = computeDiffCoverage({ lcov, diff, readSource: () => '' });
  assert.equal(res.pct, 50);
  assert.deepEqual(res.uncovered, [{ file: 'x.js', line: 1 }]);
});

test('computeDiffCoverage: sin líneas ejecutables => pct null', () => {
  const res = computeDiffCoverage({ lcov: new Map(), diff: new Map([['doc.md', new Set([1])]]), readSource: () => '' });
  assert.equal(res.pct, null);
  assert.match(formatMarkdown(res, 90), /N\/A/);
});

test('formatMarkdown PASA/FALLA', () => {
  const ok = formatMarkdown({ pct: 95, covered: 19, total: 20, files: [{ file: 'a.js', covered: 19, total: 20, inLcov: true }], uncovered: [{ file: 'a.js', line: 3 }] }, 90);
  assert.match(ok, /PASA/);
  assert.match(ok, /a\.js:3/);
  const bad = formatMarkdown({ pct: 10, covered: 1, total: 10, files: [{ file: 'b.js', covered: 1, total: 10, inLcov: false }], uncovered: [] }, 90);
  assert.match(bad, /FALLA/);
  assert.doesNotMatch(bad, /details/);
});

test('parseArgs valida entradas', () => {
  const a = parseArgs(['--lcov', 'l', '--base', 'main', '--threshold', '80', '--root', '/r', '--include', 'js$', '--exclude', 'x', '--format', 'json']);
  assert.equal(a.threshold, 80);
  assert.equal(a.format, 'json');
  assert.ok(a.include.test('a.js'));
  assert.throws(() => parseArgs(['--lcov', 'l']), /Faltan/);
  assert.throws(() => parseArgs(['--nope']), /desconocido/);
  assert.throws(() => parseArgs(['--lcov', 'l', '--base', 'b', '--threshold', '120']), /threshold/);
});

test('run/main con dependencias inyectadas', () => {
  const deps = {
    git: () => DIFF,
    readText: (p) => (p.endsWith('.lcov') ? LCOV : '// c\nfunction f() {\n  return 1;\n}\n'),
    exists: () => true,
  };
  const r = run(['--lcov', 'x.lcov', '--base', 'main', '--root', '/repo', '--format', 'json'], deps);
  assert.equal(r.pass, false);
  assert.equal(JSON.parse(r.report).threshold, 90);
  const out = [];
  assert.equal(main(['--lcov', 'x.lcov', '--base', 'main', '--root', '/repo', '--threshold', '50'], { out: (t) => out.push(t), err: () => {} }, deps), 0);
  assert.match(out.join(''), /PASA/);
  const err = [];
  assert.equal(main(['--bad'], { out: () => {}, err: (t) => err.push(t) }), 2);
  assert.match(err.join(''), /desconocido/);
  assert.equal(main(['--lcov', 'nofile', '--base', 'main', '--root', '/repo'], { out: () => {}, err: () => {} }, { ...deps, exists: (p) => !p.endsWith('nofile') }), 1);
});

test('integración: repositorio git real', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'dcov-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 't@example.com');
  g('config', 'user.name', 't');
  mkdirSync(path.join(dir, 'src'));
  writeFileSync(path.join(dir, 'src', 'a.js'), 'module.exports = 1;\n');
  g('add', '.');
  g('commit', '-qm', 'base');
  g('checkout', '-qb', 'feat/x');
  writeFileSync(path.join(dir, 'src', 'a.js'), 'module.exports = 1;\nconst y = 2;\nmodule.exports.y = y;\n');
  g('commit', '-qam', 'cambio');
  const lcovPath = path.join(dir, 'c.lcov');
  writeFileSync(lcovPath, `SF:${path.join(dir, 'src', 'a.js')}\nDA:1,1\nDA:2,1\nDA:3,0\nend_of_record\n`);
  const r = run(['--lcov', lcovPath, '--base', 'main', '--root', dir]);
  assert.equal(r.result.pct, 50);
  assert.equal(r.pass, false);
});

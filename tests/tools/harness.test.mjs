/** Pruebas del propio arnés de pruebas (FND-001). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLcov } from '../../tools/diff-coverage.mjs';
import { fixtureName, sanitize, parseArgs } from './capture-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);

test('[FND-001 CA-6] sin BACKEND_URL las sondas API se omiten con motivo y el proceso sale 0', () => {
  const env = { ...process.env, BACKEND_URL: '', SDD_NO_ENV_FILE: '1' };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/api/arnes-de-pruebas.api.test.mjs'], { cwd: root, encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /# SKIP BACKEND_URL no está definido/);
  assert.match(r.stdout, /# pass 0/);
});

test('[FND-001 CA-7] --spec <ID> filtra Karma por "[<ID> " y separa JUnit por suite', () => {
  const load = (argv, env = {}) => {
    const saved = { argv: process.argv, env: { ...process.env } };
    process.argv = ['node', 'karma', ...argv];
    Object.assign(process.env, env);
    delete require.cache[require.resolve('../../karma.conf.cjs')];
    let cfg;
    require('../../karma.conf.cjs')({ set: (c) => { cfg = c; } });
    process.argv = saved.argv;
    process.env = saved.env;
    return cfg;
  };
  const unit = load(['start', '--spec', 'FND-001']);
  assert.deepEqual(unit.client.args, ['--grep', '[FND-001 ']);
  assert.equal(unit.junitReporter.outputFile, 'junit-unit.xml');
  assert.ok(unit.files.includes('tests/unit/**/*.spec.js'));
  const integ = load(['start'], { SUITE: 'integration', COVERAGE: '1', SPEC: 'MAE-001' });
  assert.deepEqual(integ.client.args, ['--grep', '[MAE-001 ']);
  assert.equal(integ.junitReporter.outputFile, 'junit-integration.xml');
  assert.ok(integ.reporters.includes('coverage'));
  assert.ok(Object.keys(integ.preprocessors).length > 0);
  assert.deepEqual(load(['start']).client.args, []);
});

test('[FND-001 CA-8] specs.mjs dod falla y lista el CA sin prueba etiquetada', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'dod-'));
  cpSync(path.join(root, 'tools'), path.join(tmp, 'tools'), { recursive: true });
  const fase = path.join(tmp, 'specs', 'migracion-api-v1', 'f0-fundaciones');
  mkdirSync(fase, { recursive: true });
  const spec = readFileSync(path.join(root, 'specs', 'migracion-api-v1', 'f0-fundaciones', 'FND-004-geo-core.md'), 'utf8');
  writeFileSync(path.join(fase, 'FND-004-geo-core.md'), spec);
  mkdirSync(path.join(tmp, 'tests', 'unit'), { recursive: true });
  const tag = ['[FND-004', 'CA-1]'].join(' '); // construido para no contar como prueba real de FND-004
  writeFileSync(path.join(tmp, 'tests', 'unit', 'a.spec.js'), `it('${tag} x', () => {});\n`);
  const r = spawnSync(process.execPath, ['tools/specs.mjs', 'dod', 'FND-004'], { cwd: tmp, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /CA-2 tiene prueba etiquetada \[FND-004 CA-2\]/);
  assert.match(r.stdout + r.stderr, /\[PASS\] CA-1 tiene prueba etiquetada/);
});

test('[FND-001 CA-9] el LCOV de Karma usa rutas relativas y diff-coverage lo procesa', () => {
  const lcov = 'SF:master/js/modules/services/api_client.js\nDA:1,3\nend_of_record\nSF:' + path.join(root, 'server', 'proxy.js') + '\nDA:2,0\nend_of_record\n';
  const parsed = parseLcov(lcov, root);
  assert.equal(parsed.get('master/js/modules/services/api_client.js').get(1), 3);
  assert.equal(parsed.get('server/proxy.js').get(2), 0);
  const karma = readFileSync(path.join(root, 'karma.conf.cjs'), 'utf8');
  assert.match(karma, /type: 'lcovonly', file: 'lcov.info'/);
});

test('[FND-001 CA-2] capture-fixture nombra y sanea fixtures sin datos personales ni secretos', () => {
  assert.equal(fixtureName('GET', '/places/6acb99b38275a26dbdf8fcf2?x=1'), 'get__places__id');
  assert.equal(fixtureName('post', '/api/v1/journeys/12/navigations'), 'post__journeys__id__navigations');
  const clean = sanitize({ accessToken: 'abc', user: { email: 'real@tumipay.com', firstName: 'Harold' }, notes: ['escribe a x@y.co'], n: 1 });
  assert.deepEqual(clean, { accessToken: 'accessToken-ficticio', user: { email: 'usuario@example.invalid', firstName: 'Jane' }, notes: ['escribe a usuario@example.invalid'], n: 1 });
  assert.deepEqual(parseArgs(['get', '/units', '--public']), { method: 'GET', route: '/units', name: 'get__units', body: undefined, isPublic: true });
  assert.deepEqual(parseArgs(['POST', '/x', '--name', 'n', '--body', '{"a":1}']).body, { a: 1 });
  assert.throws(() => parseArgs([]), /Uso/);
});

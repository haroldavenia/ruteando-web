import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  header, sections, ids, ticks, loadSpecs, find, lint, dod, legacyHits, trace, traceMarkdown, next, setEstado,
  lintUi, contractDiff, context, parseArgs, main, Report, INITIATIVE,
} from '../specs.mjs';

const SPEC = (id, { estado = 'Borrador', deps = '—', eps = '—', maq = '—', issue = '#<n> (pendiente)', extra = '', ca = null } = {}) => `# ${id}: Historia de prueba

| Campo | Valor |
| --- | --- |
| Estado | ${estado} |
| Iniciativa / Fase | \`migracion-api-v1\` / \`f0-fundaciones\` |
| Depende de | ${deps} |
| Issue | ${issue} |
| Endpoints \`/api/v1\` | ${eps} |
| Maqueta | ${maq} |

## 1. Objetivo y contexto

Objetivo.

| Método | Ruta |
| --- | --- |
| GET | \`/api/v1/places/{id}\` |

## 2. Historia de usuario

Como operador, quiero algo, para algo.

## 3. Alcance

**Archivos autorizados**

- \`master/js/x.js\`

## 4. Requisitos

- **RF-1** — Hacer algo

## 5. Criterios de aceptación

${ca ?? '- **CA-1** (RF-1) — Dado algo, Cuando pasa, Entonces resulta'}

## 6. Diseño y restricciones técnicas

Diseño.

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | x |

## 8. Excepciones de cobertura

Ninguna.

## 9. Dependencias, riesgos y preguntas abiertas

- Riesgos: —${extra}

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | x |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
`;

function repo(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'specs-'));
  for (const [f, c] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    writeFileSync(path.join(root, f), typeof c === 'string' ? c : JSON.stringify(c));
  }
  return root;
}
const F = `${INITIATIVE}/f0-fundaciones`;
const T = `${INITIATIVE}/trazabilidad`;
const io = () => { const o = []; return { out: (t) => o.push(t), err: (t) => o.push(`ERR ${t}`), o }; };

test('header, sections, ids, ticks', () => {
  const h = header('| Campo | Valor |\n| --- | --- |\n| Estado | Lista |\n## 1. x\n| Otro | y |');
  assert.deepEqual(h, { Estado: 'Lista' });
  assert.deepEqual(Object.keys(sections('# t\n## 1. a\nx\n## 2. b\ny')), ['1. a', '2. b']);
  assert.deepEqual(ids('FND-001, ACC-002'), ['FND-001', 'ACC-002']);
  assert.deepEqual(ids('—'), []);
  assert.deepEqual(ticks('`GET /a`, `POST /b`'), ['GET /a', 'POST /b']);
  assert.deepEqual(ticks(undefined), []);
});

test('lint: una spec completa cumple la DoR', () => {
  const root = repo({
    [`${F}/FND-001-a.md`]: SPEC('FND-001', { eps: '`GET /places/{id}`', maq: '`docs/ui/maquetas/index.html#fnd-001`' }),
    [`${T}/endpoint-coverage.json`]: { items: [{ endpoint: 'GET /places/{id}', specs: ['FND-001'], status: 'in_scope' }] },
    [`${T}/legacy-inventory.json`]: { items: [] },
    'docs/ui/maquetas/index.html': '<section id="fnd-001"></section>',
  });
  const ctx = context(root);
  const r = lint(find(ctx.specs, 'FND-001'), ctx);
  assert.equal(r.passed, true, r.toString());
  assert.throws(() => find(ctx.specs, 'XXX-999'), /No existe/);
});

test('lint: detecta fallos de DoR', () => {
  const ca = '- **CA-1** (RF-1) — Sin formato\n- **CA-2** (RF-1) — Dado x, Entonces y';
  const root = repo({
    [`${F}/FND-002-b.md`]: SPEC('FND-002', { estado: 'Lista', deps: 'ZZZ-001', eps: '`POST /nada`', maq: '`docs/ui/maquetas/index.html#falta`', ca, extra: '\n- Pregunta **bloqueante**: ¿x? → y\n' }).replace('## 6. Diseño y restricciones técnicas\n\nDiseño.', '## 6. Diseño y restricciones técnicas\n\nTBD'),
    [`${T}/endpoint-coverage.json`]: { items: [] },
    'docs/ui/maquetas/index.html': '<section id="otra"></section>',
  });
  const ctx = context(root);
  const r = lint(ctx.specs[0], ctx);
  const fails = r.rows.filter((x) => x[0] === 'FAIL').map((x) => x[1]).join('\n');
  for (const frag of ['ZZZ-001', 'CA-1 en formato', 'CA-2 tiene caso', 'POST /nada documentado', 'coverage.json', 'maqueta', 'TBD', 'bloqueantes', 'Issue']) assert.match(fails, new RegExp(frag));
});

test('dod: evidencia, pruebas etiquetadas, trazabilidad y legacy-scan', () => {
  const ok = 'x\n## Veredicto\nPASS\n';
  const base = {
    [`${F}/FND-001-a.md`]: SPEC('FND-001').replace('| CA-1 | | | x |', '| CA-1 | t | c | x |'),
    [`${F}/evidencia/FND-001/2026-11-20-implementador.md`]: 'informe',
    [`${F}/evidencia/FND-001/2026-11-20-validador.md`]: ok,
    [`${F}/evidencia/FND-001/2026-11-20-contendiente.md`]: 'x\n## Veredicto\nPASS WITH GAPS\n',
    [`${F}/evidencia/FND-001/2026-11-20-calidad-seguridad.md`]: ok,
    'tests/unit/a.spec.js': "it('[FND-001 CA-1] hace algo', () => {});",
  };
  let ctx = context(repo(base));
  assert.equal(dod(ctx.specs[0], ctx).passed, true);
  const A = `${F}/evidencia/ACC-001`;
  ctx = context(repo({
    [`${F}/ACC-001-a.md`]: SPEC('ACC-001'),
    [`${A}/2026-11-20-implementador.md`]: 'informe',
    [`${A}/2026-11-20-validador.md`]: 'x\n## Veredicto\nFAIL\n',
    [`${A}/2026-11-20-contendiente.md`]: 'sin veredicto',
    [`${A}/2026-11-20-calidad-seguridad.md`]: ok,
    'tests/unit/a.spec.js': "fit('otra', () => {});",
    'master/js/viejo.js': "var u = 'oauth/token';",
  }));
  const fails = dod(ctx.specs[0], ctx).rows.filter((x) => x[0] === 'FAIL').map((x) => x[1]).join('\n');
  for (const frag of ['validador: FAIL', 'contendiente: sin veredicto', 'CA-1 tiene prueba', 'enfocadas', 'legacy-scan']) assert.match(fails, new RegExp(frag));
  const vacio = context(repo({ [`${F}/FND-003-c.md`]: SPEC('FND-003') }));
  assert.match(dod(vacio.specs[0], vacio).toString(), /informe de implementador.*\n[\s\S]*sección 10 completa \(1 filas/);
});

test('legacyHits recorre master/js, master/jade y server', () => {
  const root = repo({ 'master/js/a.js': 'x\nJourneyHttp.getList()', 'server/s.js': 'mongoose', 'master/jade/v.jade': 'p ok', 'server/m.json.backup': 'mongoose' });
  const h = legacyHits(root);
  assert.deepEqual(h.map((x) => `${x.owner}@${x.file}:${x.line}`).sort(), ['CIE-001@server/s.js:1', 'JOR-002@master/js/a.js:2']);
});

test('trace: problemas y resumen; markdown', () => {
  const root = repo({
    [`${F}/FND-001-a.md`]: SPEC('FND-001', { eps: '`GET /places/{id}`', estado: 'Hecha' }),
    [`${F}/FND-002-b.md`]: SPEC('FND-002', { estado: 'Descartada', eps: '`GET /extra`' }),
    [`${T}/legacy-inventory.json`]: { items: [{ id: 'L1', kind: 'call', legacy: 'GET /a', spec: 'FND-001' }, { id: 'L2', kind: 'call', legacy: 'GET /b', spec: 'FND-002', note: 'n' }, { id: 'L3', kind: 'call', legacy: 'GET /c', spec: 'NOP-001' }] },
    [`${T}/endpoint-coverage.json`]: { items: [
      { endpoint: 'GET /places/{id}', specs: ['FND-001'], status: 'in_scope' },
      { endpoint: 'GET /otro', specs: [], status: 'in_scope' },
      { endpoint: 'GET /x', specs: ['FND-002'], status: 'in_scope' },
      { endpoint: 'GET /driver', specs: [], status: 'out_of_scope', reason: 'móvil' },
      { endpoint: 'GET /viejo', specs: ['FND-002'], status: 'retired', reason: '404' },
    ] },
  });
  const ctx = context(root);
  const t = trace(ctx, { fase: 'f0-fundaciones' });
  const p = t.problems.join('\n');
  for (const frag of ['descartada FND-002', 'inexistente NOP-001', 'GET /otro sin spec', 'GET /x no declarado', 'GET /extra, ausente']) assert.match(p, new RegExp(frag));
  assert.match(t.resumen, /Legacy: 3 elementos \(2 cerrados\)\. Endpoints: 3 en alcance \(2 cerrados\), 1 fuera de alcance, 1 retirados/);
  const md = traceMarkdown(ctx);
  assert.match(md, /\[FND-001\]\(\.\.\/f0-fundaciones\/FND-001-a\.md\) · Hecha/);
  assert.match(md, /NOP-001 \(no existe\)/);
  assert.match(md, /Fuera: móvil/);
  assert.match(md, /Retirado: 404/);
});

test('next y setEstado', () => {
  const root = repo({
    [`${F}/FND-001-a.md`]: SPEC('FND-001', { estado: 'Hecha' }),
    [`${F}/FND-002-b.md`]: SPEC('FND-002', { estado: 'Lista', deps: 'FND-001' }),
    [`${F}/FND-003-c.md`]: SPEC('FND-003', { deps: 'FND-002' }),
    [`${F}/FND-004-d.md`]: SPEC('FND-004', { estado: 'En progreso' }),
    [`${F}/FND-005-e.md`]: SPEC('FND-005', { deps: 'FND-001' }),
  });
  const specs = loadSpecs(root);
  assert.deepEqual(next(specs), { enCurso: ['FND-004'], listas: ['FND-002'], paraDoR: ['FND-005'] });
  const s = find(specs, 'FND-003');
  assert.throws(() => setEstado(s, 'Rara'), /inválido/);
  assert.throws(() => setEstado(s, 'Lista'), /persona/);
  assert.throws(() => setEstado(s, 'Lista', { humano: 'Claude' }), /persona/);
  setEstado(s, 'En progreso');
  assert.match(readFileSync(s.file, 'utf8'), /\| Estado \| En progreso \|/);
  const t = setEstado(find(loadSpecs(root), 'FND-003'), 'Lista', { humano: 'Harold Avenia', motivo: 'DoR ok', fecha: '2026-11-20' });
  assert.match(t, /\| 2026-11-20 \| Estado → Lista \| DoR ok \| Harold Avenia \|\n$/);
});

test('lintUi y contractDiff', () => {
  assert.equal(lintUi(repo({})).passed, false);
  const full = '## 1. Tokens\n## 2. Componentes\n## 3. Patrones de pantalla\n## 4. Accesibilidad\n## 5. Textos e i18n\n';
  assert.equal(lintUi(repo({ 'docs/ui/sistema-ui.md': full })).passed, true);
  assert.match(lintUi(repo({ 'docs/ui/sistema-ui.md': '## Tokens' })).toString(), /FAIL\] sección «Componentes»/);
  const d = contractDiff({ paths: { '/api/v1/places/{id}': { get: {}, parameters: [] }, '/api/v1/units': { get: {} } } },
    [{ endpoint: 'GET /places/{placeId}', status: 'in_scope' }, { endpoint: 'GET /zones', status: 'in_scope' }, { endpoint: 'GET /viejo', status: 'retired' }]);
  assert.deepEqual(d, { nuevos: ['GET /units'], ausentes: ['GET /zones'] });
  assert.deepEqual(contractDiff({}, []), { nuevos: [], ausentes: [] });
});

test('parseArgs y Report', () => {
  assert.deepEqual(parseArgs(['lint', 'X', '--all', '--fase', 'f1']), { _: ['lint', 'X'], all: true, fase: 'f1' });
  const r = new Report('t');
  r.check(true, 'a');
  assert.equal(r.passed, true);
});

test('main: comandos de la CLI', () => {
  const root = repo({
    [`${F}/FND-001-a.md`]: SPEC('FND-001', { estado: 'Hecha', issue: '#12' }),
    [`${F}/FND-002-b.md`]: SPEC('FND-002', { ca: '- **CA-1** (RF-1) — sin formato' }),
    [`${T}/legacy-inventory.json`]: { items: [{ id: 'L1', kind: 'call', legacy: 'x', spec: 'FND-001' }] },
    [`${T}/endpoint-coverage.json`]: { items: [] },
    'master/js/a.js': 'JourneyHttp',
    'openapi.json': { paths: { '/api/v1/units': { get: {} } } },
    'docs/ui/sistema-ui.md': '## Tokens',
  });
  const run = (...a) => { const o = io(); const code = main(a, o, root); return { code, text: o.o.join('\n') }; };
  assert.match(run('status').text, /Total 2: Hecha=1, Borrador=1/);
  assert.match(run('next').text, /llevar a DoR\): FND-002/);
  assert.equal(run('lint', 'FND-001').code, 0);
  const all = run('lint', '--all');
  assert.equal(all.code, 1);
  assert.match(all.text, /2 specs: hay fallos/);
  assert.equal(run('dod', 'FND-001').code, 1);
  assert.equal(run('estado', 'FND-002', 'En revisión').code, 0);
  assert.equal(run('estado', 'FND-002', 'Hecha').code, 2);
  const tr = run('trace', '--write');
  assert.equal(tr.code, 0);
  assert.match(readFileSync(path.join(root, T, 'TRAZABILIDAD.md'), 'utf8'), /# Trazabilidad/);
  assert.equal(run('trace', '--fase', 'f0-fundaciones').code, 1);
  const ls = run('legacy-scan');
  assert.match(ls.text, /# JOR-002 \(undefined\) — 1/);
  assert.equal(ls.code, 0);
  assert.equal(run('legacy-scan', '--id', 'JOR-002').code, 1);
  assert.equal(run('lint-ui').code, 1);
  assert.equal(run('contract-diff', '--openapi', 'openapi.json').code, 1);
  assert.equal(run().code, 0);
  assert.equal(run('desconocido').code, 1);
  assert.match(run('lint', 'NOP-001').text, /ERR ✖ No existe/);
});

test('main sin trazabilidad ni maquetas', () => {
  const root = repo({ [`${F}/FND-001-a.md`]: SPEC('FND-001') });
  const o = io();
  assert.equal(main(['trace'], o, root), 0);
  assert.equal(main(['contract-diff', '--openapi', 'nada.json'], o, root), 2);
});

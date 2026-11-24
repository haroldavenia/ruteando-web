#!/usr/bin/env node
// Gobierno de specs de la migración ruteando-web → /api/v1 (plantilla harness-engineering).
// DoR, DoD, trazabilidad legacy/endpoint → spec, escaneo de código legacy y cambios de estado.
// Sin dependencias externas. Uso: node tools/specs.mjs help
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const INITIATIVE = 'specs/migracion-api-v1';
export const ESTADOS = ['Borrador', 'Lista', 'En progreso', 'En revisión', 'Hecha', 'Descartada'];
export const HUMANOS = ['Lista', 'Hecha', 'Descartada'];
export const CERRADOS = ['Hecha', 'Descartada'];
export const ROLES = ['implementador', 'validador', 'contendiente', 'calidad-seguridad'];
export const SECCIONES = ['1. Objetivo y contexto', '2. Historia de usuario', '3. Alcance', '4. Requisitos',
  '5. Criterios de aceptación', '6. Diseño y restricciones técnicas', '7. Casos de prueba esperados',
  '8. Excepciones de cobertura', '9. Dependencias, riesgos y preguntas abiertas', '10. Trazabilidad (se completa al cerrar)',
  '11. Registro de decisiones y cambios de alcance'];
export const UI_SECCIONES = ['Tokens', 'Componentes', 'Patrones de pantalla', 'Accesibilidad', 'Textos e i18n'];
const AGENTE = /\b(agente|agent|claude|gemini|antigravity|bot|gpt|copilot|arnés|ia)\b/i;

// Patrón legacy → historia responsable de eliminarlo de master/js, master/jade y server/.
export const LEGACY = [
  ['ACC-001', /oauth\/token|CLIENT_SECRECT|clientSecret|client_secret|SEFOT0lU|invalid_token/],
  ['ACC-002', /\/singup|access\.registerTwo|ActivateController/],
  ['ACC-003', /forgotPassword/],
  ['MAE-001', /typevehicle|VehicleTypesHttp/],
  ['MAE-002', /VehiclesHttp|VehicleService\b|assignedservice\b|AssignedServicesHttp/],
  ['MAE-003', /DriversHttp|\/driver\/:id/],
  ['MAE-004', /reverse_geocoding|addressHttp|GeocodingServices/],
  ['MAE-005', /PlacesHttp/],
  ['MAE-007', /CatalogsHttp|\/catalogs/],
  ['PAQ-001', /SettingsHttp|PartialLoader|server\/partials/],
  ['PAQ-003', /journey\/upload|journeyUploadFile/],
  ['JOR-001', /osrmHttp|optimalRouteOfPointCloud|optimisationFor/],
  ['JOR-002', /journeys\/summary|JourneyHttp/],
  ['JOR-003', /RoutesHttp|path\.api\.routes/],
  ['JOR-006', /VisitsHttp|visits\.json/],
  ['CIE-001', /resincTknRefresh|\$authProvider|path\.api\.|API_HOST|hanoit:9000|app\.ruteando\.co|app\.test\b|TestController|mongoose/],
];
export const SCAN_DIRS = ['master/js', 'master/jade', 'server'];

// ---------- lectura ----------
export function walk(dir, filter, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'bower_components', '.git'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (!filter || filter(p)) out.push(p);
  }
  return out;
}

/** Tabla de cabecera `| Campo | Valor |` → objeto. */
export function header(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (m && !/^-+$/.test(m[1]) && m[1] !== 'Campo') out[m[1]] = m[2];
    if (/^## /.test(line)) break;
  }
  return out;
}

/** Secciones `## N. Título` → texto. */
export function sections(text) {
  const out = {};
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = /^## (.+?)\s*$/.exec(line);
    if (h) { cur = h[1]; out[cur] = []; } else if (cur) out[cur].push(line);
  }
  for (const k of Object.keys(out)) out[k] = out[k].join('\n');
  return out;
}

export const ids = (s) => (s && s !== '—' ? [...s.matchAll(/[A-Z]{3}-\d{3}/g)].map((m) => m[0]) : []);
export const ticks = (s) => (s && s !== '—' ? [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]) : []);

export function parseSpec(file, root) {
  const text = readFileSync(file, 'utf8');
  const h = header(text);
  const title = /^# ([A-Z]{3}-\d{3}): (.+)$/m.exec(text);
  const sec = sections(text);
  const ca = [...text.matchAll(/^- \*\*CA-(\d+)\*\* \(RF-(\d+)\) — (.*)$/gm)].map((m) => ({ n: Number(m[1]), rf: Number(m[2]), text: m[3] }));
  const rf = [...text.matchAll(/^- \*\*RF-(\d+)\*\* — /gm)].map((m) => Number(m[1]));
  return {
    file, rel: path.relative(root, file).split(path.sep).join('/'), text, h, sec, ca, rf,
    id: title?.[1], title: title?.[2], estado: h.Estado, fase: (/\/ `([^`]+)`/.exec(h['Iniciativa / Fase'] || '') || [])[1],
    deps: ids(h['Depende de']), endpoints: ticks(h['Endpoints `/api/v1`']), maqueta: ticks(h.Maqueta)[0],
  };
}

export function loadSpecs(root) {
  return walk(path.join(root, INITIATIVE), (p) => /\/[A-Z]{3}-\d{3}-[^/]+\.md$/.test(p.split(path.sep).join('/')) && !p.includes(`${path.sep}evidencia${path.sep}`))
    .map((f) => parseSpec(f, root)).sort((a, b) => a.id.localeCompare(b.id));
}

export function find(specs, id) {
  const s = specs.find((x) => x.id === id);
  if (!s) throw new Error(`No existe la spec ${id}`);
  return s;
}

// ---------- reglas ----------
export class Report {
  constructor(title) { this.title = title; this.rows = []; }
  check(ok, msg) { this.rows.push([ok ? 'PASS' : 'FAIL', msg]); return ok; }
  get passed() { return this.rows.every((r) => r[0] === 'PASS'); }
  toString() {
    return [`== ${this.title}`, ...this.rows.map(([s, m]) => `  [${s}] ${m}`), `== Resultado: ${this.passed ? 'PASS' : 'FAIL'}`].join('\n');
  }
}

export function lint(s, ctx) {
  const r = new Report(`DoR ${s.id}`);
  const known = new Set(ctx.specs.map((x) => x.id));
  r.check(ESTADOS.includes(s.estado), `Estado válido (${s.estado})`);
  r.check(Boolean(s.fase), 'Iniciativa / Fase informada');
  for (const d of s.deps) r.check(known.has(d), `dependencia ${d} existe`);
  for (const k of SECCIONES) r.check(k in s.sec && s.sec[k].trim().length > 0, `sección «${k}»`);
  r.check(s.rf.length > 0, `${s.rf.length} requisitos funcionales`);
  r.check(s.ca.length > 0, `${s.ca.length} criterios de aceptación`);
  for (const rf of s.rf) r.check(s.ca.some((c) => c.rf === rf), `RF-${rf} tiene al menos un CA`);
  const casos = s.sec['7. Casos de prueba esperados'] || '';
  for (const c of s.ca) {
    r.check(/\b(Dado|Given)\b/.test(c.text) && /\b(Entonces|Then)\b/.test(c.text), `CA-${c.n} en formato Dado … Entonces`);
    r.check(new RegExp(`\\|\\s*CA-${c.n}\\s*\\|`).test(casos), `CA-${c.n} tiene caso de prueba en la sección 7`);
  }
  const alcance = s.sec['3. Alcance'] || '';
  r.check(/Archivos autorizados[\s\S]*?\n- `/.test(alcance), 'Archivos autorizados listados');
  const contrato = (s.sec['1. Objetivo y contexto'] || '').replace(/\{[^}]+\}/g, '{}');
  for (const e of s.endpoints) {
    const [m, p] = e.split(' ');
    r.check(contrato.includes(`/api/v1${p.replace(/\{[^}]+\}/g, '{}')}`) && contrato.includes(`| ${m} |`), `endpoint ${e} documentado en el contrato`);
    if (ctx.coverage) r.check(ctx.coverage.some((x) => x.endpoint === e), `endpoint ${e} está en endpoint-coverage.json`);
  }
  if (s.maqueta && ctx.mockup !== undefined) {
    const anchor = s.maqueta.split('#')[1];
    r.check(Boolean(anchor) && ctx.mockup.includes(`id="${anchor}"`), `maqueta ${s.maqueta} existe`);
  }
  const cuerpo = Object.entries(s.sec).filter(([k]) => !k.startsWith('9.') && !k.startsWith('11.')).map(([, v]) => v).join('\n');
  r.check(!/\b(TBD|TODO)\b/.test(cuerpo), 'sin TBD/TODO fuera de la sección 9');
  if (s.estado !== 'Borrador' && s.estado !== 'Descartada') {
    r.check(!/Pregunta \*\*bloqueante\*\*/.test(s.sec['9. Dependencias, riesgos y preguntas abiertas'] || ''), 'sin preguntas bloqueantes abiertas (DoR)');
    r.check(/\| Issue \| #\d+/.test(s.text), 'Issue enlazado (DoR)');
  }
  return r;
}

export function dod(s, ctx) {
  const r = new Report(`DoD ${s.id}`);
  const ev = path.join(path.dirname(s.file), 'evidencia', s.id);
  const files = existsSync(ev) ? readdirSync(ev) : [];
  for (const rol of ROLES) {
    const f = files.find((x) => x.endsWith(`-${rol}.md`));
    if (!r.check(Boolean(f), `informe de ${rol} en evidencia/${s.id}/`)) continue;
    const t = readFileSync(path.join(ev, f), 'utf8');
    const v = (/## Veredicto\s*\n+\s*(PASS WITH GAPS|PASS|FAIL)\b/.exec(t) || [])[1];
    if (rol !== 'implementador') r.check(v === 'PASS' || v === 'PASS WITH GAPS', `veredicto de ${rol}: ${v ?? 'sin veredicto'}`);
  }
  const tests = ctx.tests.map(([, t]) => t).join('\n');
  for (const c of s.ca) r.check(tests.includes(`[${s.id} CA-${c.n}]`), `CA-${c.n} tiene prueba etiquetada [${s.id} CA-${c.n}]`);
  const focus = ctx.tests.filter(([, t]) => /\b(fit|fdescribe|xit|xdescribe)\s*\(|\.(only|skip)\s*\(/.test(t)).map(([f]) => f);
  r.check(focus.length === 0, `sin pruebas enfocadas u omitidas ${focus.join(', ')}`);
  const traz = s.sec['10. Trazabilidad (se completa al cerrar)'] || '';
  const vacias = traz.split('\n').filter((l) => /^\| CA-\d+ \|\s*\|/.test(l)).length;
  r.check(vacias === 0, `sección 10 completa (${vacias} filas sin prueba)`);
  const hits = legacyHits(ctx.root).filter((h) => h.owner === s.id);
  r.check(hits.length === 0, `legacy-scan de ${s.id}: ${hits.length} coincidencias`);
  return r;
}

export function legacyHits(root) {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d), (p) => /\.(js|jade|json|html)$/.test(p) && !p.endsWith('.backup')));
  const hits = [];
  for (const f of files) {
    readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
      for (const [owner, re] of LEGACY) if (re.test(l)) hits.push({ owner, file: path.relative(root, f).split(path.sep).join('/'), line: i + 1, text: l.trim().slice(0, 110) });
    });
  }
  return hits;
}

export function trace(ctx, { fase } = {}) {
  const byId = Object.fromEntries(ctx.specs.map((s) => [s.id, s]));
  const problems = [];
  for (const i of ctx.legacy) {
    if (!byId[i.spec]) problems.push(`legacy ${i.id} «${i.legacy}» → spec inexistente ${i.spec}`);
    else if (byId[i.spec].estado === 'Descartada') problems.push(`legacy ${i.id} «${i.legacy}» → spec descartada ${i.spec}: reasignar`);
  }
  for (const e of ctx.coverage.filter((x) => x.status === 'in_scope')) {
    if (!e.specs.length) problems.push(`endpoint ${e.endpoint} sin spec`);
    for (const id of e.specs) if (!byId[id]?.endpoints.includes(e.endpoint)) problems.push(`endpoint ${e.endpoint} no declarado en ${id}`);
  }
  for (const s of ctx.specs) for (const e of s.endpoints) if (!ctx.coverage.some((x) => x.endpoint === e)) problems.push(`${s.id} declara ${e}, ausente de endpoint-coverage.json`);
  if (fase) {
    for (const s of ctx.specs.filter((x) => x.fase === fase)) if (!CERRADOS.includes(s.estado)) problems.push(`${s.id} sin cerrar (${s.estado})`);
  }
  const cerrada = (id) => CERRADOS.includes(byId[id]?.estado);
  const inScope = ctx.coverage.filter((e) => e.status === 'in_scope');
  return {
    problems,
    resumen: `Legacy: ${ctx.legacy.length} elementos (${ctx.legacy.filter((i) => cerrada(i.spec)).length} cerrados). `
      + `Endpoints: ${inScope.length} en alcance (${inScope.filter((e) => e.specs.length && e.specs.every(cerrada)).length} cerrados), `
      + `${ctx.coverage.filter((e) => e.status === 'out_of_scope').length} fuera de alcance, ${ctx.coverage.filter((e) => e.status === 'retired').length} retirados por el backend.`,
  };
}

export function traceMarkdown(ctx) {
  const byId = Object.fromEntries(ctx.specs.map((s) => [s.id, s]));
  const link = (id) => (byId[id] ? `[${id}](../${byId[id].rel.replace(`${INITIATIVE}/`, '')}) · ${byId[id].estado}` : `${id} (no existe)`);
  const L = ['# Trazabilidad', '', '> Generado con `node tools/specs.mjs trace --write`. No editar a mano: edita los JSON de esta carpeta.', '',
    '## 1. Funcionalidad legacy → historia', '', '| # | Tipo | Legacy | Historia · estado | Nota |', '| --- | --- | --- | --- | --- |'];
  for (const i of ctx.legacy) L.push(`| ${i.id} | ${i.kind} | \`${i.legacy}\` | ${link(i.spec)} | ${i.note || ''} |`);
  L.push('', '## 2. Endpoint `/api/v1` → historia', '', '| Endpoint | Historia(s) · estado | Alcance |', '| --- | --- | --- |');
  for (const e of ctx.coverage) {
    const alc = e.status === 'in_scope' ? 'Dentro' : e.status === 'retired' ? `Retirado: ${e.reason}` : `Fuera: ${e.reason}`;
    L.push(`| \`${e.endpoint}\` | ${e.specs.map(link).join('<br>') || '—'} | ${alc} |`);
  }
  return `${L.join('\n')}\n`;
}

export function next(specs) {
  const st = Object.fromEntries(specs.map((s) => [s.id, s.estado]));
  const lista = (s) => s.deps.every((d) => CERRADOS.includes(st[d]));
  return {
    enCurso: specs.filter((s) => ['En progreso', 'En revisión'].includes(s.estado)).map((s) => s.id),
    listas: specs.filter((s) => s.estado === 'Lista' && lista(s)).map((s) => s.id),
    paraDoR: specs.filter((s) => s.estado === 'Borrador' && lista(s)).map((s) => s.id),
  };
}

/** Cambia `Estado`. Lista, Hecha y Descartada exigen persona y quedan en la sección 11. */
export function setEstado(s, estado, { humano, motivo = '', fecha = new Date().toISOString().slice(0, 10) } = {}) {
  if (!ESTADOS.includes(estado)) throw new Error(`Estado inválido: ${estado}`);
  if (HUMANOS.includes(estado) && (!humano || AGENTE.test(humano))) throw new Error(`«${estado}» lo decide una persona: usa --humano "Nombre Apellido"`);
  let text = s.text.replace(/^\| Estado \| .* \|$/m, `| Estado | ${estado} |`);
  if (HUMANOS.includes(estado)) {
    const row = `| ${fecha} | Estado → ${estado} | ${motivo || '—'} | ${humano} |`;
    text = text.replace(/(## 11\. Registro de decisiones y cambios de alcance[\s\S]*?)(\n*)$/, `$1\n${row}\n`);
  }
  writeFileSync(s.file, text);
  return text;
}

export function lintUi(root) {
  const r = new Report('Sistema UI');
  const f = path.join(root, 'docs/ui/sistema-ui.md');
  if (!r.check(existsSync(f), 'docs/ui/sistema-ui.md existe')) return r;
  const t = readFileSync(f, 'utf8');
  for (const s of UI_SECCIONES) r.check(new RegExp(`^## (\\d+\\. )?${s}`, 'm').test(t), `sección «${s}»`);
  return r;
}

/** Issue de GitHub generado desde la spec (la spec manda; el Issue solo enlaza y resume). */
export function issue(s) {
  const historia = (s.sec['2. Historia de usuario'] || '').trim();
  const deps = s.deps.length ? s.deps.join(', ') : '—';
  const body = [
    `**Spec:** \`${s.rel}\``,
    `**Fase:** \`${s.fase}\` · **Depende de:** ${deps} · **Estado de la spec:** ${s.estado}`,
    `**Maqueta:** ${s.maqueta ? `\`${s.maqueta}\`` : 'sin interfaz'}`,
    `**Endpoints /api/v1:** ${s.endpoints.length ? s.endpoints.map((e) => `\`${e}\``).join(', ') : '—'}`,
    '',
    '### Historia de usuario',
    historia,
    '',
    '### Criterios de aceptación (resumen; el detalle vive en la spec)',
    ...s.ca.map((c) => `- [ ] CA-${c.n} (RF-${c.rf}) — ${c.text}`),
    '',
    '### Definition of Ready',
    `- [${s.estado === 'Borrador' ? ' ' : 'x'}] Spec en \`Lista\` (aprobada por una persona)`,
    '- [ ] Maqueta confirmada (si hay interfaz)',
  ].join('\n');
  const labels = ['tipo:historia', `fase:${(s.fase || '').split('-')[0]}`, `area:${s.id.slice(0, 3).toLowerCase()}`];
  return { title: `[${s.id}] ${s.title}`, labels, body };
}

export function contractDiff(openapi, coverage) {
  const have = new Set();
  for (const [p, ops] of Object.entries(openapi.paths || {})) {
    for (const m of Object.keys(ops)) if (/^(get|post|put|patch|delete)$/.test(m)) have.add(`${m.toUpperCase()} ${p.replace(/^\/api\/v1/, '')}`);
  }
  const norm = (e) => e.replace(/\{[^}]+\}/g, '{}');
  const known = coverage.filter((x) => x.status !== 'retired').map((x) => x.endpoint);
  const nh = new Set([...have].map(norm));
  const nk = new Set(known.map(norm));
  return { nuevos: [...have].filter((e) => !nk.has(norm(e))).sort(), ausentes: known.filter((e) => !nh.has(norm(e))).sort() };
}

/** Peticiones de una colección Postman v2.1 → ["MÉTODO /ruta"] (sin /api/v1; {{var}} → {var}). */
export function postmanEndpoints(collection, { skipFolders = [/^00 /] } = {}) {
  const out = [];
  const walkItems = (items, top) => {
    for (const it of items || []) {
      const folder = top ?? it.name;
      if (top === undefined && skipFolders.some((re) => re.test(it.name))) continue;
      if (it.item) walkItems(it.item, folder);
      else if (it.request) {
        const u = it.request.url;
        const raw = (typeof u === 'string' ? u : u?.raw || '').split('?')[0];
        const route = raw.replace(/^\{\{(base_url|api_base)\}\}/, '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '')
          .replace(/\{\{([^}]+)\}\}/g, '{$1}').replace(/\/$/, '');
        out.push({ endpoint: `${it.request.method} ${route}`, name: it.name, folder });
      }
    }
  };
  walkItems(collection.item);
  return out;
}

/** ¿La ruta concreta (con valores o {var}) encaja en el patrón de cobertura ({x} = un segmento)? */
export function matchEndpoint(pattern, actual) {
  const [pm, pp] = pattern.split(' ');
  const [am, ap] = actual.split(' ');
  if (pm !== am) return false;
  const ps = pp.split('/');
  const as = ap.split('/');
  return ps.length === as.length && ps.every((seg, i) => seg === as[i] || /^\{.+\}$/.test(seg));
}

/** Colección Postman frente a endpoint-coverage.json. */
export function postmanDiff(collection, coverage) {
  const reqs = postmanEndpoints(collection);
  const known = coverage.filter((x) => x.status !== 'retired');
  const best = (r) => known.filter((k) => matchEndpoint(k.endpoint, r.endpoint))
    .sort((a, b) => (b.endpoint.match(/\/[^{/][^/]*/g) || []).length - (a.endpoint.match(/\/[^{/][^/]*/g) || []).length)[0];
  const mapped = reqs.map((r) => ({ ...r, cubre: best(r) }));
  const nuevos = [...new Set(mapped.filter((m) => !m.cubre).map((m) => m.endpoint))].sort();
  const usados = new Set(mapped.filter((m) => m.cubre).map((m) => m.cubre.endpoint));
  const ausentes = known.filter((k) => !usados.has(k.endpoint)).map((k) => k.endpoint).sort();
  return { mapped, nuevos, ausentes };
}

// ---------- CLI ----------
export function context(root) {
  const t = path.join(root, INITIATIVE, 'trazabilidad');
  const json = (f) => (existsSync(path.join(t, f)) ? JSON.parse(readFileSync(path.join(t, f), 'utf8')).items : []);
  const mock = path.join(root, 'docs/ui/maquetas/index.html');
  return {
    root, specs: loadSpecs(root), legacy: json('legacy-inventory.json'), coverage: json('endpoint-coverage.json'),
    mockup: existsSync(mock) ? readFileSync(mock, 'utf8') : undefined,
    tests: walk(path.join(root, 'tests'), (p) => /\.(js|mjs|cjs)$/.test(p) && !p.includes(`${path.sep}fixtures${path.sep}`)).map((f) => [path.relative(root, f), readFileSync(f, 'utf8')]),
  };
}

export function parseArgs(list) {
  const o = { _: [] };
  for (let i = 0; i < list.length; i++) {
    if (list[i].startsWith('--')) {
      const k = list[i].slice(2);
      o[k] = list[i + 1] && !list[i + 1].startsWith('--') ? list[++i] : true;
    } else o._.push(list[i]);
  }
  return o;
}

export const HELP = `Uso: node tools/specs.mjs <comando>
  status                              Estado de todas las historias
  next                                Historias desbloqueadas (dependencias Hechas o Descartadas)
  lint <ID> | --all                   Definition of Ready mecánica
  dod <ID>                            Definition of Done mecánica (evidencia, pruebas etiquetadas, legacy-scan)
  estado <ID> <Estado> [--humano "Nombre"] [--motivo "…"]   Lista/Hecha/Descartada solo con persona
  trace [--fase f2-maestros] [--write] Cobertura legacy y endpoints → historias
  legacy-scan [--id ID]               Restos legacy en master/js, master/jade y server/
  lint-ui                             Secciones obligatorias de docs/ui/sistema-ui.md
  contract-diff --openapi <archivo>   Compara /v3/api-docs con endpoint-coverage.json
  contract-diff --postman <colección> Mapea cada petición de Postman a la cobertura (falla si hay rutas sin historia)
  issue <ID> [--write]                Título, etiquetas y cuerpo del Issue (con --write: .tmp/issues/<ID>.md para gh issue create)`;

export function main(argv, io = { out: (t) => process.stdout.write(`${t}\n`), err: (t) => process.stderr.write(`${t}\n`) }, root = process.cwd()) {
  const a = parseArgs(argv);
  const [cmd, id, valor] = a._;
  try {
    const ctx = context(root);
    switch (cmd) {
      case 'status': {
        io.out('| ID | Título | Estado | Depende de |\n| --- | --- | --- | --- |');
        for (const s of ctx.specs) io.out(`| ${s.id} | ${s.title} | ${s.estado} | ${s.deps.join(', ') || '—'} |`);
        const c = {};
        ctx.specs.forEach((s) => { c[s.estado] = (c[s.estado] || 0) + 1; });
        io.out(`\nTotal ${ctx.specs.length}: ${Object.entries(c).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        return 0;
      }
      case 'next': {
        const n = next(ctx.specs);
        io.out(`En curso: ${n.enCurso.join(', ') || '—'}\nListas para implementar: ${n.listas.join(', ') || '—'}\nBorradores con dependencias cerradas (llevar a DoR): ${n.paraDoR.join(', ') || '—'}`);
        return 0;
      }
      case 'lint': {
        const list = a.all ? ctx.specs : [find(ctx.specs, id)];
        let ok = true;
        for (const s of list) {
          const r = lint(s, ctx);
          ok = r.passed && ok;
          if (!a.all || !r.passed) io.out(r.toString());
        }
        if (a.all) io.out(`${list.length} specs: ${ok ? 'todas cumplen' : 'hay fallos'}`);
        return ok ? 0 : 1;
      }
      case 'issue': {
        const i = issue(find(ctx.specs, id));
        if (a.write) {
          const dir = path.join(root, '.tmp', 'issues');
          mkdirSync(dir, { recursive: true });
          writeFileSync(path.join(dir, `${id}.md`), `${i.body}\n`);
          io.out(`gh issue create --title "${i.title}" ${i.labels.map((l) => `--label "${l}"`).join(' ')} --body-file .tmp/issues/${id}.md`);
        } else io.out(`${i.title}\n${i.labels.join(', ')}\n\n${i.body}`);
        return 0;
      }
      case 'dod': { const r = dod(find(ctx.specs, id), ctx); io.out(r.toString()); return r.passed ? 0 : 1; }
      case 'estado': { setEstado(find(ctx.specs, id), valor, { humano: a.humano, motivo: a.motivo }); io.out(`${id} → ${valor}`); return 0; }
      case 'trace': {
        const t = trace(ctx, { fase: a.fase });
        io.out(t.resumen);
        t.problems.forEach((p) => io.out(`  ✘ ${p}`));
        io.out(t.problems.length ? `Trazabilidad: ${t.problems.length} problemas` : 'Trazabilidad: OK');
        if (a.write) writeFileSync(path.join(root, INITIATIVE, 'trazabilidad', 'TRAZABILIDAD.md'), traceMarkdown(ctx));
        return t.problems.length ? 1 : 0;
      }
      case 'legacy-scan': {
        const st = Object.fromEntries(ctx.specs.map((s) => [s.id, s.estado]));
        const hits = legacyHits(root).filter((h) => !a.id || h.owner === a.id);
        const by = {};
        hits.forEach((h) => (by[h.owner] ||= []).push(h));
        for (const [o, hs] of Object.entries(by)) {
          io.out(`# ${o} (${st[o]}) — ${hs.length}`);
          hs.slice(0, 10).forEach((h) => io.out(`  ${h.file}:${h.line}  ${h.text}`));
        }
        const bloq = hits.filter((h) => st[h.owner] === 'Hecha' || a.id);
        io.out(`Total ${hits.length}; bloqueantes ${bloq.length}`);
        return bloq.length ? 1 : 0;
      }
      case 'lint-ui': { const r = lintUi(root); io.out(r.toString()); return r.passed ? 0 : 1; }
      case 'contract-diff': {
        if (a.postman) {
          const p = postmanDiff(JSON.parse(readFileSync(path.resolve(root, a.postman), 'utf8')), ctx.coverage);
          io.out(`Postman: ${p.mapped.length} peticiones, ${p.mapped.filter((m) => m.cubre).length} mapeadas a la cobertura`);
          io.out(`En Postman sin historia: ${p.nuevos.join(', ') || '—'}\nEn cobertura sin ejemplo en Postman: ${p.ausentes.join(', ') || '—'}`);
          return p.nuevos.length ? 1 : 0;
        }
        const d = contractDiff(JSON.parse(readFileSync(path.resolve(root, a.openapi), 'utf8')), ctx.coverage);
        io.out(`Nuevos en el backend (sin historia): ${d.nuevos.join(', ') || '—'}\nEn cobertura pero ausentes del backend: ${d.ausentes.join(', ') || '—'}`);
        return d.nuevos.length || d.ausentes.length ? 1 : 0;
      }
      default: io.out(HELP); return cmd ? 1 : 0;
    }
  } catch (e) {
    io.err(`✖ ${e.message}`);
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) process.exitCode = main(process.argv.slice(2));

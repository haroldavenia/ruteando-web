#!/usr/bin/env node
// Cobertura de código nuevo o modificado (diff coverage).
// Spec: docs/engineering/calidad-y-ci.md §Cobertura. Sin dependencias externas.
//
// Uso:
//   node tools/diff-coverage.mjs --lcov <archivo.lcov> --base <ref> [--root <dir>]
//        [--threshold 90] [--include <regex>] [--exclude <regex>] [--format md|json]
//
// Reglas (no negociables, ver ADR-0005):
// - Cuenta solo líneas AÑADIDAS o MODIFICADAS en el diff `<base>...HEAD`.
// - Si el archivo está en el LCOV, cuenta las líneas instrumentadas (DA) del diff.
// - Si un archivo de código cambiado NO aparece en el LCOV (ninguna prueba lo cargó),
//   sus líneas cambiadas "contables" cuentan como NO cubiertas. Así no se puede
//   subir la métrica dejando código fuera de las pruebas.
// - Los archivos de prueba se excluyen del denominador.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_INCLUDE = /\.(c|m)?js$/;
export const DEFAULT_EXCLUDE = /(^|\/)(node_modules|test|tests|__tests__|coverage)\/|\.(test|spec)\.(c|m)?js$/;

/** Normaliza separadores y elimina "./" inicial. */
export function normalizePath(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Convierte una ruta del LCOV (absoluta o relativa) en relativa a root. */
export function toRelative(file, root) {
  const f = normalizePath(file);
  const r = normalizePath(root).replace(/\/$/, '');
  if (!r) return f;
  if (f.startsWith(r + '/')) return f.slice(r.length + 1);
  // Windows: la unidad (C:) puede faltar o variar en mayúsculas en uno de los lados.
  const strip = (x) => x.replace(/^[A-Za-z]:(?=\/)/, '');
  if (strip(f).startsWith(strip(r) + '/')) return strip(f).slice(strip(r).length + 1);
  return f;
}

/** LCOV -> Map<archivo, Map<línea, hits>> */
export function parseLcov(text, root = '') {
  const result = new Map();
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('SF:')) {
      current = toRelative(line.slice(3), root);
      if (!result.has(current)) result.set(current, new Map());
    } else if (line.startsWith('DA:') && current) {
      const [ln, hits] = line.slice(3).split(',');
      const n = Number(ln);
      const h = Number(hits);
      if (Number.isInteger(n) && Number.isFinite(h)) {
        const prev = result.get(current).get(n) ?? 0;
        result.get(current).set(n, prev + h);
      }
    } else if (line === 'end_of_record') {
      current = null;
    }
  }
  return result;
}

/** Diff unificado (-U0) -> Map<archivo, Set<línea añadida>> */
export function parseUnifiedDiff(text) {
  const result = new Map();
  let file = null;
  let next = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('+++ ')) {
      const target = line.slice(4).trim();
      file = target === '/dev/null' ? null : normalizePath(target.replace(/^b\//, ''));
      if (file && !result.has(file)) result.set(file, new Set());
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk) {
      next = Number(hunk[1]);
      continue;
    }
    if (!file) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) {
      result.get(file).add(next);
      next += 1;
    } else if (line.startsWith(' ')) {
      next += 1;
    }
  }
  return result;
}

/** ¿La línea fuente es ejecutable? (heurística para archivos sin LCOV) */
export function isCountableLine(src) {
  const t = (src ?? '').trim();
  if (t === '') return false;
  if (/^(\/\/|\/\*|\*|\*\/)/.test(t)) return false;
  if (/^[{}()[\];,]+$/.test(t)) return false;
  return true;
}

export function computeDiffCoverage({ lcov, diff, readSource, include = DEFAULT_INCLUDE, exclude = DEFAULT_EXCLUDE }) {
  const files = [];
  let covered = 0;
  let total = 0;
  const uncovered = [];
  for (const [file, lines] of [...diff.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!include.test(file) || exclude.test(file) || lines.size === 0) continue;
    const da = lcov.get(file);
    let fCovered = 0;
    let fTotal = 0;
    const sourceLines = da ? null : (readSource(file) ?? '').split(/\r?\n/);
    for (const ln of [...lines].sort((a, b) => a - b)) {
      if (da) {
        if (!da.has(ln)) continue;
        fTotal += 1;
        if (da.get(ln) > 0) fCovered += 1;
        else uncovered.push({ file, line: ln });
      } else if (isCountableLine(sourceLines[ln - 1])) {
        fTotal += 1;
        uncovered.push({ file, line: ln });
      }
    }
    if (fTotal === 0) continue;
    files.push({ file, covered: fCovered, total: fTotal, inLcov: Boolean(da) });
    covered += fCovered;
    total += fTotal;
  }
  const pct = total === 0 ? null : Math.round((covered / total) * 10000) / 100;
  return { files, covered, total, pct, uncovered };
}

export function formatMarkdown(res, threshold) {
  const out = ['### Cobertura de código nuevo o modificado', ''];
  if (res.pct === null) {
    out.push('N/A: el diff no contiene líneas ejecutables de código fuente.');
    return out.join('\n');
  }
  const ok = res.pct >= threshold;
  out.push(`**${res.pct}%** (${res.covered}/${res.total} líneas) — umbral ${threshold}% → ${ok ? 'PASA' : 'FALLA'}`, '');
  out.push('| Archivo | Cubiertas | Total | En LCOV |', '| --- | ---: | ---: | :---: |');
  for (const f of res.files) out.push(`| \`${f.file}\` | ${f.covered} | ${f.total} | ${f.inLcov ? 'sí' : 'no'} |`);
  if (res.uncovered.length) {
    out.push('', '<details><summary>Líneas no cubiertas</summary>', '');
    for (const u of res.uncovered.slice(0, 200)) out.push(`- \`${u.file}:${u.line}\``);
    out.push('', '</details>');
  }
  return out.join('\n');
}

export function parseArgs(argv) {
  const args = { threshold: 90, root: process.cwd(), format: 'md' };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--lcov') { args.lcov = v; i += 1; }
    else if (k === '--base') { args.base = v; i += 1; }
    else if (k === '--root') { args.root = v; i += 1; }
    else if (k === '--threshold') { args.threshold = Number(v); i += 1; }
    else if (k === '--include') { args.include = new RegExp(v); i += 1; }
    else if (k === '--exclude') { args.exclude = new RegExp(v); i += 1; }
    else if (k === '--format') { args.format = v; i += 1; }
    else throw new Error(`Argumento desconocido: ${k}`);
  }
  if (!args.lcov || !args.base) throw new Error('Faltan --lcov y/o --base');
  if (!Number.isFinite(args.threshold) || args.threshold < 0 || args.threshold > 100) {
    throw new Error('--threshold debe estar entre 0 y 100');
  }
  return args;
}

export function run(argv, deps = {}) {
  const {
    git = (cwd, a) => execFileSync('git', a, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
    readText = (p) => readFileSync(p, 'utf8'),
    exists = existsSync,
  } = deps;
  const args = parseArgs(argv);
  const root = path.resolve(args.root);
  const lcovText = exists(args.lcov) ? readText(args.lcov) : '';
  const diffText = git(root, ['diff', '-U0', '--no-color', '--no-ext-diff', `${args.base}...HEAD`, '--', '.']);
  const res = computeDiffCoverage({
    lcov: parseLcov(lcovText, root),
    diff: parseUnifiedDiff(diffText),
    readSource: (f) => (exists(path.join(root, f)) ? readText(path.join(root, f)) : ''),
    include: args.include,
    exclude: args.exclude,
  });
  const report = args.format === 'json' ? JSON.stringify({ ...res, threshold: args.threshold }, null, 2) : formatMarkdown(res, args.threshold);
  const pass = res.pct === null || res.pct >= args.threshold;
  return { report, pass, result: res };
}

export function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }, deps = {}) {
  try {
    const { report, pass } = run(argv, deps);
    io.out(report + '\n');
    return pass ? 0 : 1;
  } catch (err) {
    io.err(`diff-coverage: ${err.message}\n`);
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}

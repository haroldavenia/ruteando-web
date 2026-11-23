#!/usr/bin/env node
// Filtra un reporte JSON de ESLint a los mensajes ubicados en líneas añadidas o
// modificadas del diff `<base>...HEAD`. Permite exigir lint estricto al código
// nuevo sin bloquear por deuda heredada del mismo archivo (fricción del piloto SEC-001).
//
// Uso: npx eslint -f json <archivos> > eslint.json
//      node tools/lint-diff.mjs --report eslint.json --base origin/main [--root .]

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUnifiedDiff, toRelative } from './diff-coverage.mjs';

export function filterMessages(results, diff, root) {
  const inDiff = [];
  let legacy = 0;
  for (const r of results) {
    const file = toRelative(r.filePath, root);
    const lines = diff.get(file) ?? new Set();
    for (const m of r.messages ?? []) {
      // Errores fatales de parseo (sin línea) siempre bloquean.
      if (m.fatal || !m.line || lines.has(m.line)) inDiff.push({ file, line: m.line ?? 0, rule: m.ruleId ?? 'parse', message: m.message, severity: m.severity });
      else legacy += 1;
    }
  }
  return { inDiff, legacy };
}

export function format({ inDiff, legacy }) {
  const out = [];
  for (const m of inDiff) out.push(`${m.file}:${m.line}  ${m.severity === 2 ? 'error' : 'warning'}  ${m.message}  (${m.rule})`);
  out.push(`Lint del diff: ${inDiff.length} problema(s) en líneas cambiadas; ${legacy} heredado(s) en esos archivos (informativo).`);
  return out.join('\n');
}

export function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }, deps = {}) {
  const { git = (cwd, a) => execFileSync('git', a, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }), readText = (p) => readFileSync(p, 'utf8') } = deps;
  const args = { root: process.cwd() };
  for (let i = 0; i < argv.length; i += 2) {
    const key = { '--report': 'report', '--base': 'base', '--root': 'root' }[argv[i]];
    if (!key || argv[i + 1] === undefined) {
      io.err(`lint-diff: argumento inválido ${argv[i]}\n`);
      return 2;
    }
    args[key] = argv[i + 1];
  }
  if (!args.report || !args.base) {
    io.err('lint-diff: faltan --report y/o --base\n');
    return 2;
  }
  const root = path.resolve(args.root);
  let results;
  try {
    results = JSON.parse(readText(args.report));
  } catch (e) {
    io.err(`lint-diff: reporte ilegible (${e.message})\n`);
    return 2;
  }
  const diff = parseUnifiedDiff(git(root, ['diff', '-U0', '--no-color', '--no-ext-diff', `${args.base}...HEAD`, '--', '.']));
  const res = filterMessages(results, diff, root);
  io.out(format(res) + '\n');
  return res.inDiff.length > 0 ? 1 : 0; // --max-warnings 0: también los warnings del diff bloquean
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}

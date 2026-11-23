#!/usr/bin/env node
/**
 * Une varios LCOV en uno (FND-001): node tools/merge-lcov.mjs <salida> <entrada>...
 * Las entradas que no existen se ignoran (una suite puede no haberse ejecutado).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function merge(texts) {
  return texts.map((t) => t.trim()).filter(Boolean).join('\n') + '\n';
}

export function main(argv, io = { out: (t) => process.stdout.write(t) }) {
  const [output, ...inputs] = argv;
  if (!output || inputs.length === 0) {
    io.out('Uso: merge-lcov.mjs <salida> <entrada>...\n');
    return 2;
  }
  const found = inputs.filter((f) => existsSync(f));
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, merge(found.map((f) => readFileSync(f, 'utf8'))));
  io.out(`lcov: ${found.length}/${inputs.length} archivos → ${output}\n`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}

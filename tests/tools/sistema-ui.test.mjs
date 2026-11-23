/** Sistema UI y maquetas (FND-005). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintUi, loadSpecs } from '../../tools/specs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('[FND-005 CA-1] docs/ui/sistema-ui.md tiene las secciones obligatorias', () => {
  const r = lintUi(root);
  assert.equal(r.passed, true, r.toString());
  assert.equal(r.rows.length, 6);
});

test('[FND-005 CA-2] cada spec con interfaz enlaza un ancla existente de la maqueta, salvo la app móvil', () => {
  const html = readFileSync(path.join(root, 'docs', 'ui', 'maquetas', 'index.html'), 'utf8');
  const specs = loadSpecs(root).filter((s) => s.estado !== 'Descartada' && s.maqueta);
  assert.ok(specs.length >= 30, `specs con maqueta: ${specs.length}`);
  for (const s of specs) {
    const anchor = s.maqueta.split('#')[1];
    assert.ok(html.includes(`id="${anchor}"`), `${s.id} → #${anchor}`);
  }
  assert.doesNotMatch(html, /id="drv-|\/driver\/routes/);
});

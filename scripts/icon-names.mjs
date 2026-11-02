// Iconos de la fuente Material Symbols. `index.html` pide a Google Fonts solo los iconos que la aplicación usa (`icon_names=`): la
// fuente completa pesa ~740 KiB y el subconjunto, unos pocos KiB. Un icono que falte en la lista se vería como texto («home»).
//
//   node scripts/icon-names.mjs            comprueba que los iconos que el código declara están en index.html (lo usa la CI; sin red)
//   node scripts/icon-names.mjs --update   recalcula la lista COMPLETA (pide el catálogo de Google) y reescribe index.html
//
// `--update` toma como candidatos todas las palabras en minúsculas con forma de nombre de icono que aparecen entre comillas o
// como texto en el código (src/app) y se queda con las que existen en el catálogo: así no importa cómo se declare el icono
// (texto fijo, expresión, campo `icon:`, mapa de estados…). La comprobación sin red solo mira los sitios donde se declaran iconos.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../ng-ruteando/', import.meta.url));
const indexFile = join(root, 'src/index.html');
const CATALOG_URL = 'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true';
const WORD = /^[a-z][a-z0-9_]*$/;

const walk = (dir) => readdirSync(dir).flatMap((name) => { const path = join(dir, name); return statSync(path).isDirectory() ? walk(path) : [path]; });
const files = walk(join(root, 'src/app')).filter((f) => /\.(ts|html)$/.test(f) && !/\.spec\.ts$/.test(f) && !f.includes(`${sep}i18n${sep}`));
const sources = files.map((f) => readFileSync(f, 'utf8'));

/** Palabras que aparecen junto a un icono (`status === 'ready' ? …`, `icon: 'name'`) pero no son iconos. */
const NOT_ICONS = new Set(['name', 'ready']);

/** Sitios donde se declara un icono (sin red). */
function declared() {
  const found = new Set();
  const add = (name) => WORD.test(name) && !NOT_ICONS.has(name) && found.add(name);
  for (const src of sources) {
    for (const m of src.matchAll(/<mat-icon[^>]*>([\s\S]*?)<\/mat-icon>/g)) {
      const inner = m[1].trim();
      if (!inner.includes('{{')) add(inner);
      else for (const q of inner.matchAll(/'([a-z][a-z0-9_]*)'/g)) add(q[1]);
    }
    for (const m of src.matchAll(/fontIcon="([a-z0-9_]+)"/g)) add(m[1]);
    for (const m of src.matchAll(/\b(?:icon|[a-z]*Icon|glyph)\s*:\s*'([a-z][a-z0-9_]*)'/g)) add(m[1]);
    for (const m of src.matchAll(/\[icon\]="([^"]*)"/g)) for (const q of m[1].matchAll(/'([a-z][a-z0-9_]*)'/g)) add(q[1]);
  }
  return found;
}

/** Todas las palabras con forma de nombre de icono (se filtran con el catálogo). */
function candidates() {
  const found = new Set();
  for (const src of sources) {
    for (const m of src.matchAll(/'([a-z][a-z0-9_]*)'/g)) found.add(m[1]);
    for (const m of src.matchAll(/>\s*([a-z][a-z0-9_]*)\s*</g)) found.add(m[1]);
    for (const m of src.matchAll(/"([a-z][a-z0-9_]*)"/g)) found.add(m[1]);
  }
  return found;
}

const urlIcons = () => {
  const html = readFileSync(indexFile, 'utf8');
  const m = /icon_names=([a-z0-9_,]+)/.exec(html);
  return m ? new Set(m[1].split(',')) : null;
};

if (process.argv.includes('--update')) {
  const raw = (await fetch(CATALOG_URL).then((r) => r.text())).replace(/^\)\]\}'\s*/, '');
  const catalog = new Set(JSON.parse(raw).icons.map((i) => i.name));
  const names = [...new Set([...declared(), ...[...candidates()].filter((w) => catalog.has(w))])].filter((n) => catalog.has(n)).sort();
  let html = readFileSync(indexFile, 'utf8');
  const list = names.join(',');
  html = /icon_names=[a-z0-9_,]+/.test(html)
    ? html.replace(/icon_names=[a-z0-9_,]+/, `icon_names=${list}`)
    : html.replace('Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,350,0,0', `Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,350,0,0&icon_names=${list}`);
  writeFileSync(indexFile, html);
  console.log(`${names.length} iconos en index.html`);
  process.exit(0);
}

const inUrl = urlIcons();
if (!inUrl) {
  console.error('index.html no tiene icon_names=: la fuente de iconos se descargaría completa (~740 KiB). Ejecuta: node scripts/icon-names.mjs --update');
  process.exit(1);
}
const missing = [...declared()].filter((n) => !inUrl.has(n)).sort();
console.log(`${inUrl.size} iconos en index.html; el código declara ${declared().size}`);
if (missing.length) {
  console.error(`Faltan en index.html (se verían como texto): ${missing.join(', ')}\nEjecuta: node scripts/icon-names.mjs --update`);
  process.exit(1);
}
console.log('Iconos al día.');

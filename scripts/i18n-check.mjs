// Comprueba las traducciones de la interfaz (ng-ruteando/src/app/core/i18n/dictionaries): saca de la aplicación todos los textos
// que pasan por `t('…')` y por la tubería `'…' | t` y verifica que cada uno tenga traducción al inglés y al portugués, y que los
// diccionarios no guarden claves que ya no se usan ni marcadores `{0}` distintos de los del texto fuente.
// Uso: node scripts/i18n-check.mjs            (sale con error si falta o sobra algo)
//      node scripts/i18n-check.mjs --keys     (lista las claves usadas, una por línea)
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../ng-ruteando/', import.meta.url));
const require = createRequire(root + 'package.json');
const ts = require('typescript');

const walk = (dir) => readdirSync(dir).flatMap((name) => { const path = join(dir, name); return statSync(path).isDirectory() ? walk(path) : [path]; });
const files = walk(join(root, 'src/app')).filter((f) => /\.(ts|html)$/.test(f) && !/\.spec\.ts$/.test(f) && !f.includes(`${sep}core${sep}i18n${sep}`));

const unescape = (s) => s.replace(/\\(['\\])/g, '$1');
const used = new Map(); // clave -> primer archivo
const add = (key, file) => { const k = unescape(key); if (!used.has(k)) used.set(k, file.replace(root, '')); };
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?<![\w.$])t\(\s*'((?:[^'\\\n]|\\.)*)'/g)) add(m[1], file);
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'\s*\|\s*t\b/g)) add(m[1], file);
}

if (process.argv.includes('--keys')) {
  console.log([...used.keys()].join('\n'));
  process.exit(0);
}

// ------------------------------------------------------------------ texto en español sin traducir
const SPANISH = /^\s*(de|en|a|y|o|del|al)\s*$|[áéíóúñ¿¡ÁÉÍÓÚÑ]|\b(el|la|los|las|del|con|para|por|que|se|una|al|hay|sin|ya|sus|más|ahora|tu|tus|este|esta|estos|estas)\b/i;
/** Marcas que se aceptan sin traducir: nombres propios, ejemplos de datos y valores técnicos (archivo -> fragmentos). */
const ALLOWED = [/Bogotá|Colombia|Carrera 7|Paquete de Ana|Llamar al llegar|sin-permiso|^Español$|^a$|^(en|EN)$/];

function untranslated() {
  const found = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const report = (line, text) => { if (!ALLOWED.some((re) => re.test(text))) found.push(`${file.replace(root, '')}:${line}  ${text.replace(/\s+/g, ' ').slice(0, 110)}`); };
    if (file.endsWith('.ts')) {
      const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true);
      const insideT = (node) => { for (let n = node.parent; n; n = n.parent) { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't') return true; if (ts.isDecorator(n)) return false; } return false; };
      const visit = (node) => {
        if (ts.isDecorator(node)) { // plantillas en línea: se revisan como HTML más abajo
          const obj = node.expression.arguments?.[0];
          if (obj && ts.isObjectLiteralExpression(obj)) for (const p of obj.properties) if (ts.isPropertyAssignment(p) && p.name.getText() === 'template' && ts.isNoSubstitutionTemplateLiteral(p.initializer)) checkTemplate(file, p.initializer.text, sf.getLineAndCharacterOfPosition(p.initializer.getStart()).line + 1, found, report);
          return;
        }
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isLiteralTypeNode(node)) return;
        const textOf = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) ? node.text : null;
        if (textOf !== null && SPANISH.test(textOf) && !insideT(node) && !(ts.isPropertyAssignment(node.parent) && node.parent.name === node)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          if (!/^\s*(\/\/|\*)/.test(src.split('\n')[line - 1] ?? '')) report(line, textOf);
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    } else {
      checkTemplate(file, src, 1, found, report);
    }
  }
  return found;
}

/** Textos y atributos de una plantilla que tienen español y no pasan por `| t`. */
function checkTemplate(file, tpl, firstLine, found, report) {
  const lineAt = (index) => firstLine + tpl.slice(0, index).split('\n').length - 1;
  const stripped = tpl.replace(/\{\{[\s\S]*?\}\}/g, (m) => (/\|\s*t\b/.test(m) ? ' ' : m.replace(/'[^']*'/g, (lit) => (SPANISH.test(lit) ? lit : ''))));
  for (const m of stripped.matchAll(/>([^<>{}@]*[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}[^<>{}@]*)</g)) if (SPANISH.test(m[1])) report(lineAt(m.index), m[1]);
  for (const m of stripped.matchAll(/\s([a-zA-Z-]+)="([^"{]*)"/g)) if (!/^(class|routerLink|href|src|id|name|type|role|autocomplete|placeholder-unused)$/.test(m[1]) && SPANISH.test(m[2]) && !/\|\s*t\b/.test(m[2])) report(lineAt(m.index), `${m[1]}="${m[2]}"`);
  for (const m of stripped.matchAll(/'([^']*)'/g)) {
    const after = stripped.slice(m.index + m[0].length, m.index + m[0].length + 90);
    // `state.countText('vehículo', 'vehículos')` traduce las palabras dentro del método, con `t(variable)`
    const wrapped = /^(\)?\s*\|\s*t\b|[^"]*?\)\s*\|\s*t\b)/.test(after) || /countText\([^)]*$/.test(stripped.slice(Math.max(0, m.index - 80), m.index));
    if (SPANISH.test(m[1]) && !wrapped && m.index > 0 && /\[[^\]]*\]="[^"]*$/.test(stripped.slice(Math.max(0, m.index - 120), m.index))) report(lineAt(m.index), m[1]);
  }
}

if (process.argv.includes('--spanish')) {
  const found = untranslated();
  console.log(found.join('\n'));
  console.log(`${found.length} texto(s) en español sin traducir`);
  process.exit(found.length ? 1 : 0);
}

/** Lee las claves y valores de `export const X = { … }` sin ejecutar nada. */
function readDictionary(file) {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true);
  const entries = new Map();
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop) && (ts.isStringLiteral(prop.name) || ts.isNoSubstitutionTemplateLiteral(prop.name)) && ts.isStringLiteralLike(prop.initializer)) {
          entries.set(prop.name.text, prop.initializer.text);
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return entries;
}

const markers = (s) => [...s.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort().join('');
let problems = 0;
for (const [lang, file] of [['en', 'dictionaries/en.ts'], ['pt', 'dictionaries/pt.ts']]) {
  const dictionary = readDictionary(join(root, 'src/app/core/i18n', file));
  const missing = [...used.keys()].filter((k) => !dictionary.has(k) || dictionary.get(k) === '');
  const stale = [...dictionary.keys()].filter((k) => !used.has(k));
  const brokenMarkers = [...dictionary].filter(([k, v]) => used.has(k) && v !== '' && markers(k) !== markers(v));
  console.log(`${lang}: ${used.size} textos usados, ${dictionary.size} traducidos, faltan ${missing.length}, sobran ${stale.length}, marcadores distintos ${brokenMarkers.length}`);
  for (const k of missing.slice(0, 40)) console.log(`  FALTA  ${k}   (${used.get(k)})`);
  for (const k of stale.slice(0, 20)) console.log(`  SOBRA  ${k}`);
  for (const [k, v] of brokenMarkers.slice(0, 20)) console.log(`  MARCADORES  ${k}  =>  ${v}`);
  problems += missing.length + stale.length + brokenMarkers.length;
}
if (problems) { console.error(`\n${problems} problema(s) en las traducciones.`); process.exit(1); }
console.log('Traducciones completas.');

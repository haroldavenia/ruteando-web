// Genera los iconos de la PWA (ng-ruteando/src/assets/icons) desde el emblema de la marca (shared/brand/brand.component.ts).
// Usa Chrome sin interfaz como rasterizador: CHROME_BIN o la ruta habitual. Uso: node scripts/generate-pwa-icons.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const chrome = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = fileURLToPath(new URL('../ng-ruteando/src/assets/icons/', import.meta.url));
mkdirSync(out, { recursive: true });

// Emblema a pantalla completa dentro de la zona segura (60 %): sirve igual de icono normal, maskable y de Apple.
const page = (size) => `<!doctype html><html><body style="margin:0;background:#000">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" style="display:block">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a3fc0"/><stop offset="1" stop-color="#b8326f"/></linearGradient>
<g id="arrow"><path d="M24 11 A13 13 0 0 1 35.26 17.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M37 20.5 L32.66 19 L37.86 16 Z" fill="#fff"/></g></defs>
<rect width="512" height="512" fill="url(#g)"/>
<g transform="translate(103 103) scale(6.4)">
<rect x="20" y="1.5" width="8" height="4" rx="1.5" fill="#fff"/>
<rect x="36" y="6" width="6" height="3.2" rx="1.2" transform="rotate(40 39 7.6)" fill="#fff"/>
<circle cx="24" cy="26" r="19" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-width="3"/>
<g transform="translate(0 2)"><use href="#arrow"/><use href="#arrow" transform="rotate(120 24 24)"/><use href="#arrow" transform="rotate(240 24 24)"/></g>
</g></svg></body></html>`;

const tmp = mkdtempSync(join(tmpdir(), 'pwa-icons-'));
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  const html = join(tmp, `${size}.html`);
  writeFileSync(html, page(size));
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${size},${size}`,
      `--screenshot=${join(out, name)}`,
      pathToFileURL(html).href,
    ],
    { stdio: 'ignore' }
  );
  console.log('✔', name);
}

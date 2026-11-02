// Genera ng-ruteando/src/favicon.ico (16, 32 y 48 px) desde ng-ruteando/src/favicon.svg, el emblema de la marca.
// Usa Chrome sin interfaz como rasterizador (CHROME_BIN o la ruta habitual) y empaqueta los PNG en un .ico.
// Uso: node scripts/generate-favicon.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const chrome = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const src = fileURLToPath(new URL('../ng-ruteando/src/', import.meta.url));
const svg = readFileSync(join(src, 'favicon.svg'), 'utf8');
const SIZES = [16, 32, 48];

const tmp = mkdtempSync(join(tmpdir(), 'favicon-'));
const images = SIZES.map((size) => {
  const html = join(tmp, `${size}.html`);
  const png = join(tmp, `${size}.png`);
  // Fondo transparente: las esquinas redondeadas del icono no deben salir con relleno
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body></html>`);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
    `--window-size=${size},${size}`, `--screenshot=${png}`, pathToFileURL(html).href], { stdio: 'ignore' });
  return { size, data: readFileSync(png) };
});

// Formato ICO con imágenes PNG: cabecera (6 bytes), una entrada de 16 bytes por imagen y los datos
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // tipo: icono
header.writeUInt16LE(images.length, 4);
let offset = 6 + 16 * images.length;
const entries = images.map(({ size, data }) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0); // ancho
  entry.writeUInt8(size, 1); // alto
  entry.writeUInt16LE(1, 4); // planos
  entry.writeUInt16LE(32, 6); // bits por píxel
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += data.length;
  return entry;
});
writeFileSync(join(src, 'favicon.ico'), Buffer.concat([header, ...entries, ...images.map((image) => image.data)]));
console.log('✔ favicon.ico', images.map((image) => `${image.size}px ${image.data.length} B`).join(', '));

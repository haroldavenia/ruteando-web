import { ROUTE_COLORS_DARK } from '../map/route-colors';

type Scheme = 'light' | 'dark';

/** Canales 0-255 de un color computado (`rgb()`, `rgba()` o `color(srgb ...)`). */
function channels(css: string): [number, number, number] {
  const srgb = css.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (srgb) {
    return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255];
  }
  const rgb = css.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (!rgb) {
    throw new Error(`Color no reconocido: ${css}`);
  }
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

function luminance(css: string): number {
  const [r, g, b] = channels(css).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG entre dos colores. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function resolve(host: HTMLElement, token: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  host.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/** Pares (primer plano, fondo) que usan las pantallas de acceso. */
const TEXT_PAIRS: [string, string, string][] = [
  ['etiqueta de estado neutra', '--mat-sys-on-surface', '--mat-sys-surface-container-highest'],
  ['etiqueta de estado de éxito', '--app-on-success-container', '--app-success-container'],
  ['etiqueta de estado informativa', '--app-on-info-container', '--app-info-container'],
  ['etiqueta de estado de aviso', '--app-on-warning-container', '--app-warning-container'],
  ['etiqueta de estado de peligro', '--mat-sys-on-error-container', '--mat-sys-error-container'],
  ['requisito de contraseña pendiente', '--mat-sys-on-surface-variant', '--mat-sys-surface-container-high'],
  ['requisito de contraseña cumplido', '--app-on-success-container', '--app-success-container'],
  ['requisito de contraseña no cumplido', '--mat-sys-on-error-container', '--mat-sys-error-container'],
  ['icono de la presentación del acceso', '--mat-sys-on-primary-container', '--mat-sys-primary-container'],
  // La cabecera de Inicio es un tinte de `primary-container` sobre `surface-container-low`: el peor caso es el contenedor puro
  ['título de la cabecera de Inicio', '--mat-sys-on-surface', '--mat-sys-primary-container'],
  ['saludo de la cabecera de Inicio', '--mat-sys-on-surface-variant', '--mat-sys-primary-container'],
  ['texto del botón con degradado (extremo rosa; el violeta es «texto del botón principal»)', '--mat-sys-on-primary', '--mat-sys-tertiary'],
  ['palabra con el degradado de la marca (extremo violeta)', '--mat-sys-primary', '--mat-sys-surface'],
  ['palabra con el degradado de la marca (extremo rosa)', '--mat-sys-tertiary', '--mat-sys-surface'],
  ['texto sobre tarjeta', '--mat-sys-on-surface', '--mat-sys-surface-container-low'],
  ['etiquetas de resumen sobre tarjeta', '--mat-sys-on-surface-variant', '--mat-sys-surface-container-low'],
  ['enlaces sobre tarjeta', '--mat-sys-primary', '--mat-sys-surface-container-low'],
  ['texto sobre cabecera de tabla', '--mat-sys-on-surface', '--mat-sys-surface-container'],
  ['título y texto', '--mat-sys-on-surface', '--mat-sys-surface'],
  ['etiquetas y ayudas', '--mat-sys-on-surface-variant', '--mat-sys-surface'],
  ['enlaces', '--mat-sys-primary', '--mat-sys-surface'],
  ['texto del botón principal', '--mat-sys-on-primary', '--mat-sys-primary'],
  ['mensajes de error', '--mat-sys-error', '--mat-sys-surface'],
];
const CONTROL_PAIRS: [string, string, string][] = [
  ['borde de los campos', '--mat-sys-outline', '--mat-sys-surface'],
  ['indicador de foco', '--mat-sys-primary', '--mat-sys-surface'],
];

describe('contraste de la interfaz', () => {
  let host: HTMLElement;

  function open(scheme: Scheme): void {
    host?.remove();
    host = document.createElement('div');
    host.style.colorScheme = scheme;
    document.body.appendChild(host);
  }
  afterEach(() => host?.remove());

  for (const scheme of ['light', 'dark'] as const) {
    describe(`tema ${scheme === 'light' ? 'claro' : 'oscuro'}`, () => {
      beforeEach(() => open(scheme));

      for (const [name, fg, bg] of TEXT_PAIRS) {
        it(`${name}: al menos 4,5 a 1`, () => {
          expect(contrast(resolve(host, fg), resolve(host, bg))).toBeGreaterThanOrEqual(4.5);
        });
      }

      for (const [name, fg, bg] of CONTROL_PAIRS) {
        it(`${name}: al menos 3 a 1`, () => {
          expect(contrast(resolve(host, fg), resolve(host, bg))).toBeGreaterThanOrEqual(3);
        });
      }
    });
  }

  it('los colores de ruta para fondos oscuros superan 3 a 1 frente a la superficie oscura (también las líneas sobre el tinte de la marca)', () => {
    open('dark');
    const hex = (color: string) => `rgb(${[1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).join(', ')})`;
    const surface = resolve(host, '--mat-sys-surface');
    const tint = resolve(host, '--mat-sys-primary-container');
    for (const color of ROUTE_COLORS_DARK) {
      expect(contrast(hex(color), surface)).withContext(`${color} sobre la superficie`).toBeGreaterThanOrEqual(3);
      expect(contrast(hex(color), tint)).withContext(`${color} sobre el tinte`).toBeGreaterThanOrEqual(3);
    }
  });

  it('la función de contraste da 21 a 1 para negro sobre blanco y 1 a 1 para el mismo color', () => {
    expect(contrast('rgb(0, 0, 0)', 'rgb(255, 255, 255)')).toBeCloseTo(21, 0);
    expect(contrast('rgb(120, 120, 120)', 'rgb(120, 120, 120)')).toBeCloseTo(1, 5);
  });
});

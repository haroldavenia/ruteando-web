export {};

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
  ['etiqueta de estado de éxito', '--mat-sys-on-primary-container', '--mat-sys-primary-container'],
  ['etiqueta de estado informativa', '--mat-sys-on-secondary-container', '--mat-sys-secondary-container'],
  ['etiqueta de estado de aviso', '--mat-sys-on-tertiary-container', '--mat-sys-tertiary-container'],
  ['etiqueta de estado de peligro', '--mat-sys-on-error-container', '--mat-sys-error-container'],
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

  it('la función de contraste da 21 a 1 para negro sobre blanco y 1 a 1 para el mismo color', () => {
    expect(contrast('rgb(0, 0, 0)', 'rgb(255, 255, 255)')).toBeCloseTo(21, 0);
    expect(contrast('rgb(120, 120, 120)', 'rgb(120, 120, 120)')).toBeCloseTo(1, 5);
  });
});

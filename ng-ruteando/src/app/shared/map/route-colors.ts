/**
 * Colores de las rutas: ocho tonos de las paletas de Okabe-Ito y de Tol, pensados para personas con
 * daltonismo y sin amarillo puro (poco contraste sobre el mapa). Con más rutas se repiten por orden;
 * lo que identifica una ruta no es solo el color, también su nombre y su número en las paradas.
 */
export const ROUTE_COLORS: readonly string[] = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#882255', '#117733'];

/** Nombre en español de cada color de la paleta, en el mismo orden (para quien no distingue los tonos). */
export const ROUTE_COLOR_NAMES: readonly string[] = ['Azul', 'Bermellón', 'Verde', 'Rosa', 'Naranja', 'Celeste', 'Vino', 'Verde oscuro'];

/** Nombre del color si es de la paleta; si no, el propio valor. */
export function colorName(hex: string | null): string {
  if (!hex) {
    return 'Sin color';
  }
  const index = ROUTE_COLORS.findIndex((c) => c.toLowerCase() === hex.toLowerCase());
  return index >= 0 ? ROUTE_COLOR_NAMES[index] : hex;
}

/**
 * Los mismos ocho tonos, más luminosos, para fondos oscuros: sobre la superficie oscura los originales se apagan.
 * Cada uno supera 3:1 frente a la superficie oscura (lo comprueba la prueba de contraste).
 */
export const ROUTE_COLORS_DARK: readonly string[] = ['#4DB0F0', '#FF8A3D', '#2FD3A0', '#F29AC8', '#F5B93D', '#8FD0FF', '#E36BA0', '#6BD68A'];

export function routeColor(routeIndex: number): string {
  const size = ROUTE_COLORS.length;
  return ROUTE_COLORS[((routeIndex % size) + size) % size];
}

/**
 * Color de la ruta para el esquema que se ve: la paleta luminosa sobre fondos oscuros. Lo usan los mapas, que dibujan en un canvas
 * y no entienden `light-dark()`.
 */
export function routeColorFor(routeIndex: number, scheme: 'light' | 'dark'): string {
  const palette = scheme === 'dark' ? ROUTE_COLORS_DARK : ROUTE_COLORS;
  return palette[((routeIndex % palette.length) + palette.length) % palette.length];
}

/** Color de la ruta que cambia con el esquema de color de la página (`light-dark()`), para ilustraciones en SVG o CSS. */
export function routeColorThemed(routeIndex: number): string {
  const size = ROUTE_COLORS.length;
  const index = ((routeIndex % size) + size) % size;
  return `light-dark(${ROUTE_COLORS[index]}, ${ROUTE_COLORS_DARK[index]})`;
}

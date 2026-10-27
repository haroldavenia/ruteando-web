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

export function routeColor(routeIndex: number): string {
  const size = ROUTE_COLORS.length;
  return ROUTE_COLORS[((routeIndex % size) + size) % size];
}

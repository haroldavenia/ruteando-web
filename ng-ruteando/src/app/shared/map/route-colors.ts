/**
 * Colores de las rutas: ocho tonos de las paletas de Okabe-Ito y de Tol, pensados para personas con
 * daltonismo y sin amarillo puro (poco contraste sobre el mapa). Con más rutas se repiten por orden;
 * lo que identifica una ruta no es solo el color, también su nombre y su número en las paradas.
 */
export const ROUTE_COLORS: readonly string[] = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#882255', '#117733'];

export function routeColor(routeIndex: number): string {
  const size = ROUTE_COLORS.length;
  return ROUTE_COLORS[((routeIndex % size) + size) % size];
}

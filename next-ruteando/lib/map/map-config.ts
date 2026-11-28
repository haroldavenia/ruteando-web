/**
 * Configuración del mapa. La URL de teselas y la atribución vienen del proveedor elegido (OpenStreetMap); cambiar de proveedor exige
 * ajustar también `img-src` de la CSP (`proxy.ts`). Las claves de cliente no se guardan en este fichero.
 */
export const MAP_CONFIG = {
  /** Plantilla XYZ con `{z}`, `{x}` y `{y}`. */
  tilesUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  /** Texto (HTML) de atribución que exige el proveedor; siempre visible en el mapa. */
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
  /** Centro y zoom cuando no hay marcador (Bogotá). */
  center: { lat: 4.6097, lng: -74.0817 },
  zoom: 11,
} as const;

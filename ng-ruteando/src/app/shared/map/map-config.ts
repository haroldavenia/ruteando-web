import { InjectionToken } from '@angular/core';

/** Configuración del mapa por entorno. La URL de teselas y la atribución vienen del proveedor elegido. */
export interface MapConfig {
  /** Plantilla XYZ con `{z}`, `{x}` y `{y}`. */
  tilesUrl: string;
  /** Texto (HTML) de atribución que exige el proveedor; siempre visible en el mapa. */
  attribution: string;
  /** Centro y zoom cuando no hay marcador. */
  center: { lat: number; lng: number };
  zoom: number;
}

export const MAP_CONFIG = new InjectionToken<MapConfig>('MAP_CONFIG');

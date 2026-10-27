import { MapConfig } from '../app/shared/map/map-config';

/** Teselas de prueba: una imagen incrustada, para no pedir nada a la red. */
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export const TEST_MAP_CONFIG: MapConfig = {
  tilesUrl: PIXEL,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  center: { lat: 4.6097, lng: -74.0817 },
  zoom: 11,
};

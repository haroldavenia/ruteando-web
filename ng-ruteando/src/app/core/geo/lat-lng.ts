/** Posición de dominio: latitud y longitud con nombre, para no mezclar el orden de las coordenadas. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Punto GeoJSON tal como lo envía el gateway en `location`: `[longitud, latitud]`. */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Crea una coordenada válida (latitud -90..90, longitud -180..180) o `null`. */
export function latLng(lat: unknown, lng: unknown): LatLng | null {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { lat, lng };
}

/** `[longitud, latitud]` del gateway (GeoJSON) a coordenada de dominio. */
export function fromGeoJsonPoint(coordinates: readonly unknown[] | null | undefined): LatLng | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }
  return latLng(coordinates[1], coordinates[0]);
}

/** Coordenada de dominio a `location` del gateway. */
export function toGeoJsonPoint(point: LatLng): GeoJsonPoint | null {
  const valid = latLng(point?.lat, point?.lng);
  return valid ? { type: 'Point', coordinates: [valid.lng, valid.lat] } : null;
}

/** Coordenada en el orden del mapa (OpenLayers en EPSG:4326): `[longitud, latitud]`. */
export function toOlCoordinate(point: LatLng): [number, number] | null {
  const valid = latLng(point?.lat, point?.lng);
  return valid ? [valid.lng, valid.lat] : null;
}

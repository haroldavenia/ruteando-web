import type { GeocodeQuery, GeocodeResult, ReverseGeocodeResult } from '@/lib/api/models';
import { fromGeoJsonPoint, type GeoJsonPoint, type LatLng, latLng, toGeoJsonPoint } from '@/lib/map/lat-lng';

/**
 * Contrato de `POST /geocoding` y `POST /reverse-geocoding`.
 *
 * HIPÓTESIS SIN VERIFICAR: la colección Postman no trae cuerpo ni respuesta de estos dos endpoints. Lo que
 * sigue sale de la app AngularJS (petición `{ address, city, country }`; respuesta con la dirección
 * estandarizada, la ubicación y un puntaje) y de cómo el gateway devuelve el resto de sus recursos
 * (ubicación como punto GeoJSON `[lon, lat]`). Todo lo que dependa de eso está en este fichero y se lee de
 * forma tolerante: si el gateway real responde distinto, solo hay que corregirlo aquí.
 */

/** Puntaje (0 a 1) desde el que una dirección cuenta como «ubicada» y no solo «aproximada». */
export const MATCH_SCORE = 0.8;

export function geocodeBody(query: GeocodeQuery): Record<string, string> {
  const body: Record<string, string> = { address: query.address.trim() };
  const city = query.city?.trim();
  const country = query.country?.trim();
  if (city) {
    body['city'] = city;
  }
  if (country) {
    body['country'] = country;
  }
  return body;
}

export function reverseBody(point: LatLng): { location: GeoJsonPoint } | null {
  const location = toGeoJsonPoint(point);
  return location ? { location } : null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

/** Ubicación en cualquiera de las formas razonables: punto GeoJSON, `{lat, lng}` o `{latitude, longitude}`. */
export function readLocation(value: unknown): LatLng | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  if (Array.isArray(record['coordinates'])) {
    return fromGeoJsonPoint(record['coordinates']);
  }
  const lat = record['lat'] ?? record['latitude'];
  const lng = record['lng'] ?? record['lon'] ?? record['longitude'];
  return latLng(lat, lng);
}

/** Puntaje a la escala 0 a 1 (el geocodificador puede darlo en 0 a 100). */
function readScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value > 1 ? Math.min(value / 100, 1) : value;
}

const SPELLINGS = ['standardizedAddress', 'standarizedAddress', 'formattedAddress', 'address'] as const;

/** Interpreta la respuesta de `POST /geocoding`. Sin ubicación válida, la dirección cuenta como no ubicada. */
export function readGeocodeResult(body: unknown): GeocodeResult {
  const record = asRecord(body);
  const location = readLocation(record?.['location']);
  const score = readScore(record?.['score']);
  if (!record || !location) {
    return { status: 'unmatch', standardizedAddress: null, location: null, score };
  }
  const given = typeof record['status'] === 'string' ? record['status'].toLowerCase() : '';
  const status =
    given === 'match' || given === 'mean' ? given : score !== null && score < MATCH_SCORE ? 'mean' : 'match';
  const standardizedAddress = SPELLINGS.map((key) => asText(record[key])).find((text) => text !== null) ?? null;
  return { status, standardizedAddress, location, score };
}

/** Interpreta la respuesta de `POST /reverse-geocoding`. */
export function readReverseResult(body: unknown): ReverseGeocodeResult {
  const record = asRecord(body);
  const address = record ? (SPELLINGS.map((key) => asText(record[key])).find((text) => text !== null) ?? null) : null;
  return { address, city: asText(record?.['city']), country: asText(record?.['country']) };
}

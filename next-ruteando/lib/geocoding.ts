import type { GeocodeQuery, GeocodeResult, ReverseGeocodeResult } from '@/lib/api/models';
import { ApiError, requestJson } from '@/lib/api-client';
import type { TFunction } from '@/lib/i18n/core';
import type { LatLng } from '@/lib/map/lat-lng';

import { geocodeBody, readGeocodeResult, readReverseResult, reverseBody } from './geocoding-contract';

/** Estados con los que el geocodificador dice «no encontré esa dirección»: no son un fallo de la petición. */
const NOT_FOUND = [404, 422];
const NOTHING: ReverseGeocodeResult = { address: null, city: null, country: null };

/** Ubica una dirección. Una dirección que no se encuentra responde `unmatch`; un fallo real (red, 5xx) lanza `ApiError`. */
export async function geocode(query: GeocodeQuery, t: TFunction): Promise<GeocodeResult> {
  try {
    return readGeocodeResult(await requestJson<unknown>('POST', '/middleware/data/geocoding', geocodeBody(query), t));
  } catch (error) {
    if (error instanceof ApiError && NOT_FOUND.includes(error.status)) {
      return { status: 'unmatch', standardizedAddress: null, location: null, score: null };
    }
    throw error;
  }
}

/** La dirección más cercana a un punto; sin dirección conocida, todo `null`. */
export async function reverseGeocode(point: LatLng, t: TFunction): Promise<ReverseGeocodeResult> {
  const body = reverseBody(point);
  if (!body) return NOTHING;
  try {
    return readReverseResult(await requestJson<unknown>('POST', '/middleware/data/reverse-geocoding', body, t));
  } catch (error) {
    if (error instanceof ApiError && NOT_FOUND.includes(error.status)) return NOTHING;
    throw error;
  }
}

import { LatLng } from '../../geo/lat-lng';

/** Resultado de ubicar una dirección: los mismos valores que el dominio `GeocodingStatus` del gateway. */
export type GeocodeStatus = 'match' | 'mean' | 'manual' | 'unmatch';

/** Lo que se le pide al geocodificador: la dirección y, si se sabe, la ciudad y el país. */
export interface GeocodeQuery {
  address: string;
  city?: string | null;
  country?: string | null;
}

/** Resultado normalizado de `POST /geocoding`, ya en el dominio (`LatLng`, no el formato del gateway). */
export interface GeocodeResult {
  /** `match`: ubicada; `mean`: aproximada; `unmatch`: no se encontró. */
  status: 'match' | 'mean' | 'unmatch';
  /** Dirección estandarizada que devolvió el geocodificador. */
  standardizedAddress: string | null;
  location: LatLng | null;
  /** Puntaje entre 0 y 1 (si el gateway lo da en 0 a 100 se normaliza). */
  score: number | null;
}

/** Resultado de `POST /reverse-geocoding`: la dirección más cercana al punto, o `null` si no hay. */
export interface ReverseGeocodeResult {
  address: string | null;
  city: string | null;
  country: string | null;
}

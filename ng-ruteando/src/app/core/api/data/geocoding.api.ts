import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import { LatLng } from '../../geo/lat-lng';
import { API_BASE_URL } from '../api-config';
import { ApiError } from '../api-error';
import { GeocodeQuery, GeocodeResult, ReverseGeocodeResult } from '../models';
import { geocodeBody, readGeocodeResult, readReverseResult, reverseBody } from './geocoding-contract';

/** Estados con los que el geocodificador dice «no encontré esa dirección»: no son un fallo de la petición. */
const NOT_FOUND = [404, 422];

const NOTHING: ReverseGeocodeResult = { address: null, city: null, country: null };

/**
 * Geocodificación (`POST /geocoding`) y geocodificación inversa (`POST /reverse-geocoding`). El contrato
 * de ambos no está documentado: ver `geocoding-contract.ts`.
 */
@Injectable({ providedIn: 'root' })
export class GeocodingApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Ubica una dirección. Una dirección que no se encuentra responde `unmatch`; un fallo real (red, 5xx) sí es error. */
  geocode(query: GeocodeQuery): Observable<GeocodeResult> {
    return this.http.post<unknown>(`${this.baseUrl}/geocoding`, geocodeBody(query)).pipe(
      map(readGeocodeResult),
      catchError((error: unknown) =>
        error instanceof ApiError && NOT_FOUND.includes(error.status)
          ? of<GeocodeResult>({ status: 'unmatch', standardizedAddress: null, location: null, score: null })
          : throwError(() => error)
      )
    );
  }

  /** La dirección más cercana a un punto; sin dirección conocida, todo `null`. */
  reverse(point: LatLng): Observable<ReverseGeocodeResult> {
    const body = reverseBody(point);
    if (!body) {
      return of(NOTHING);
    }
    return this.http.post<unknown>(`${this.baseUrl}/reverse-geocoding`, body).pipe(
      map(readReverseResult),
      catchError((error: unknown) =>
        error instanceof ApiError && NOT_FOUND.includes(error.status) ? of(NOTHING) : throwError(() => error)
      )
    );
  }
}

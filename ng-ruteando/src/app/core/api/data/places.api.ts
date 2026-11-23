import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { LatLng } from '../../geo/lat-lng';
import { CrudApi } from '../crud-api';
import { Place, PlaceInput } from '../models';

@Injectable({ providedIn: 'root' })
export class PlacesApi extends CrudApi<Place, PlaceInput> {
  protected readonly resource = 'places';

  /** Lugares a menos de `maxDistance` metros de un punto. */
  nearby(center: LatLng, maxDistance: number): Observable<Place[]> {
    const params = new HttpParams().set('lon', center.lng).set('lat', center.lat).set('maxDistance', maxDistance);
    return this.http.get<Place[]>(this.url('nearby'), { params });
  }
}

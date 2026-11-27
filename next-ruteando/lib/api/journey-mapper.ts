import { fromGeoJsonPoint } from '@/lib/map/lat-lng';
import { decodePolyline5 } from '@/lib/map/polyline';

import type { DomainRoute, DomainWaypoint, Journey, JourneyRoute, PlannedJourney, Waypoint } from './models';

function toDomainWaypoint({ coordinates, ...rest }: Waypoint): DomainWaypoint {
  return { ...rest, position: fromGeoJsonPoint(coordinates) };
}

/** Ruta del gateway al modelo de dominio: `geoJson` (polilínea 5) pasa a `geometry`, las paradas a `LatLng`. */
export function toDomainRoute({ geoJson, waypoints, ...rest }: JourneyRoute): DomainRoute {
  return { ...rest, geometry: decodePolyline5(geoJson), waypoints: (waypoints ?? []).map(toDomainWaypoint) };
}

export function toPlannedJourney({ routes, ...rest }: Journey): PlannedJourney {
  return { ...rest, routes: (routes ?? []).map(toDomainRoute) };
}

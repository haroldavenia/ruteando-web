import { DomainRoute, DomainWaypoint } from '../../core/api/models';
import { latLng, toOlCoordinate } from '../../core/geo/lat-lng';

/** `[longitud, latitud]`, el orden de OpenLayers en EPSG:4326. */
export type LonLat = [number, number];

export interface RouteLine {
  coordinates: LonLat[];
  /** `true` cuando la línea no es la geometría del gateway sino la unión de las paradas en orden. */
  dashed: boolean;
}

export interface MapStop {
  waypoint: DomainWaypoint;
  coordinate: LonLat;
}

function toLonLat(point: { lat: number; lng: number } | null | undefined): LonLat | null {
  return point && latLng(point.lat, point.lng) ? toOlCoordinate(point) : null;
}

/** Paradas con una posición válida, en el orden de la ruta; las demás se omiten. */
export function routeStops(route: DomainRoute): MapStop[] {
  return [...route.waypoints]
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((waypoint) => {
      const coordinate = toLonLat(waypoint.position);
      return coordinate ? [{ waypoint, coordinate }] : [];
    });
}

/**
 * Línea de una ruta: su geometría si la trae (descartando puntos no válidos) o, si no, la unión de las
 * paradas con posición, marcada como discontinua. Sin dos puntos no hay línea.
 */
export function routeLine(route: DomainRoute): RouteLine | null {
  const own = route.geometry.map(toLonLat).filter((c): c is LonLat => c !== null);
  if (own.length >= 2) {
    return { coordinates: own, dashed: false };
  }
  const joined = routeStops(route).map((stop) => stop.coordinate);
  return joined.length >= 2 ? { coordinates: joined, dashed: true } : null;
}

/** Todas las coordenadas que hay que ver de una o varias rutas: sus líneas y sus paradas. */
export function routeCoordinates(routes: readonly DomainRoute[]): LonLat[] {
  return routes.flatMap((route) => [...(routeLine(route)?.coordinates ?? []), ...routeStops(route).map((stop) => stop.coordinate)]);
}

/** Caja `[oeste, sur, este, norte]` de un conjunto de coordenadas, o `null` si está vacío. */
export function lonLatBounds(coordinates: readonly LonLat[]): [number, number, number, number] | null {
  if (coordinates.length === 0) {
    return null;
  }
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lon, lat] of coordinates) {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [west, south, east, north];
}

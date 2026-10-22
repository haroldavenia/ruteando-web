import { Place } from '../../core/api/models';
import { fromGeoJsonPoint } from '../../core/geo/lat-lng';

/** Etiquetas en español de `PlaceType`; el dominio es editable en el gateway, así que la clave sirve de reserva. */
export const PLACE_TYPE_LABELS: Readonly<Record<string, string>> = {
  depot: 'Depósito',
  warehouse: 'Almacén',
  store: 'Tienda',
  office: 'Oficina',
  custom: 'Personalizado',
};

export function placeTypeLabel(key: string): string {
  return PLACE_TYPE_LABELS[key] ?? key;
}

const COORDINATE = new Intl.NumberFormat('es', { minimumFractionDigits: 5, maximumFractionDigits: 5, useGrouping: false });

/** `latitud / longitud` con cinco decimales, o vacío si la ubicación no es válida. */
export function formatLocation(place: Pick<Place, 'location'>): string {
  const point = fromGeoJsonPoint(place.location?.coordinates);
  return point ? `${COORDINATE.format(point.lat)} / ${COORDINATE.format(point.lng)}` : '';
}

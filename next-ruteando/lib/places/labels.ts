import type { Place } from '@/lib/api/models';
import type { TFunction } from '@/lib/i18n/core';
import { fromGeoJsonPoint } from '@/lib/map/lat-lng';

/** Tipos de lugar que conoce la aplicación, en su orden (`PlaceType`; el dominio es editable en el gateway, así que la clave sirve de reserva). */
export const PLACE_TYPE_KEYS = ['depot', 'warehouse', 'store', 'office', 'custom'] as const;

export function placeTypeLabel(key: string, t: TFunction): string {
  const labels: Record<string, string> = {
    depot: t('Depósito'),
    warehouse: t('Almacén'),
    store: t('Tienda'),
    office: t('Oficina'),
    custom: t('Personalizado'),
  };
  return labels[key] ?? key;
}

/** Los tipos en un orden estable: primero los que conoce la aplicación y después los que traigan los lugares. */
export function placeTypeOrder(places: readonly Pick<Place, 'type'>[]): string[] {
  const known: string[] = [...PLACE_TYPE_KEYS];
  const unknown = [...new Set(places.map((p) => p.type))].filter((type) => !known.includes(type));
  return [...known, ...unknown];
}

/** `latitud / longitud` con cinco decimales, o vacío si la ubicación no es válida. */
export function formatLocation(place: Pick<Place, 'location'>, lang: string): string {
  const point = fromGeoJsonPoint(place.location?.coordinates);
  if (!point) return '';
  const number = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
    useGrouping: false,
  });
  return `${number.format(point.lat)} / ${number.format(point.lng)}`;
}

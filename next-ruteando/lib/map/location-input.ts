import type { TFunction } from '@/lib/i18n/core';

import { type LatLng, latLng } from './lat-lng';

/** Número de un campo de texto; vacío o no numérico es `null`. */
export function parseCoordinate(text: string | null | undefined): number | null {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/** El punto de dos campos de texto, o `null` si falta uno o está fuera de rango. */
export function pointOf(lat: string | null | undefined, lng: string | null | undefined): LatLng | null {
  return latLng(parseCoordinate(lat), parseCoordinate(lng));
}

/** Errores de latitud y longitud (obligatorias y dentro de rango), por campo. */
export function locationErrors(
  lat: string | null | undefined,
  lng: string | null | undefined,
  t: TFunction
): { lat?: string; lng?: string } {
  const errors: { lat?: string; lng?: string } = {};
  const check = (name: 'lat' | 'lng', text: string | null | undefined, limit: number, message: string) => {
    const value = parseCoordinate(text);
    if (value === null) errors[name] = t('Este campo es obligatorio');
    else if (Math.abs(value) > limit) errors[name] = message;
  };
  check('lat', lat, 90, t('La latitud debe estar entre -90 y 90'));
  check('lng', lng, 180, t('La longitud debe estar entre -180 y 180'));
  return errors;
}

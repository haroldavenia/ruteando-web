import type { StatusTone } from '@/lib/list/list-logic';
export type { StatusTone };
export type StatusDomain = 'package' | 'journey' | 'visit' | 'geocoding' | 'assigned';

const PACKAGE_TONES: Readonly<Record<string, StatusTone>> = {
  attended: 'success',
  pending: 'neutral',
  unattended: 'warning',
  cancelled: 'danger',
  returned: 'info',
};

const JOURNEY_TONES: Readonly<Record<string, StatusTone>> = {
  planning: 'neutral',
  planned: 'info',
  in_progress: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'danger',
};

/** Resultado de ubicar una dirección: ubicada bien, aproximada (a revisar), puesta a mano y no encontrada. */
const GEOCODING_TONES: Readonly<Record<string, StatusTone>> = {
  match: 'success',
  mean: 'warning',
  manual: 'info',
  unmatch: 'danger',
};

/** Servicio asignado: el gateway lo crea `ACTIVO`; los demás estados se ven neutros hasta saber cuáles hay. */
const ASSIGNED_TONES: Readonly<Record<string, StatusTone>> = {
  ACTIVO: 'success',
};

const TONES: Readonly<Record<StatusDomain, Readonly<Record<string, StatusTone>>>> = {
  package: PACKAGE_TONES,
  visit: PACKAGE_TONES,
  journey: JOURNEY_TONES,
  geocoding: GEOCODING_TONES,
  assigned: ASSIGNED_TONES,
};

/**
 * Tono de la etiqueta de un estado, decidido en un solo sitio por dominio: paquetes, jornadas, visitas (las visitas
 * son paquetes en una ruta; «No disponible» y «Cargando» son neutros), geocodificación y servicios asignados. Un estado
 * desconocido es neutro.
 */
export function statusTone(domain: StatusDomain, key: string | null): StatusTone {
  if (key === null) {
    return 'neutral';
  }
  return TONES[domain][key] ?? 'neutral';
}

export type StatusTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';
export type StatusDomain = 'package' | 'journey' | 'visit';

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

/**
 * Tono de la etiqueta de un estado, decidido en un solo sitio por dominio: paquetes, jornadas y visitas (las visitas
 * son paquetes en una ruta; «No disponible» y «Cargando» son neutros). Un estado desconocido es neutro.
 */
export function statusTone(domain: StatusDomain, key: string | null): StatusTone {
  if (key === null) {
    return 'neutral';
  }
  const tones = domain === 'journey' ? JOURNEY_TONES : PACKAGE_TONES;
  return tones[key] ?? 'neutral';
}

/** Icono de Material de cada tono: refuerza el significado para quien no distingue los colores. */
export const TONE_ICONS: Readonly<Record<StatusTone, string>> = {
  neutral: 'schedule',
  success: 'check_circle',
  info: 'info',
  warning: 'warning',
  danger: 'cancel',
};

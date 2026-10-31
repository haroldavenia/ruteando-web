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

/** Glifo de línea de cada tono (el del diseño: anillo, marca, círculo, exclamación y cruz): refuerza el significado para quien no distingue los colores. */
export const TONE_ICONS: Readonly<Record<StatusTone, string>> = {
  neutral: 'radio_button_unchecked',
  success: 'check',
  info: 'circle',
  warning: 'priority_high',
  danger: 'close',
};

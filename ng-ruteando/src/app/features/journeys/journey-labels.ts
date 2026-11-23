import { t } from '../../core/i18n/i18n';
/** Etiquetas en español de `JourneyStatus`; el gateway también devuelve `planned` y `completed`. */
export const JOURNEY_STATUS_LABELS: Readonly<Record<string, string>> = {
  planning: t('En planificación'),
  planned: t('Planificada'),
  in_progress: t('En curso'),
  completed: t('Completada'),
  failed: t('Fallida'),
  cancelled: t('Cancelada'),
};

/** Etiquetas en español de `StopType`. */
export const STOP_TYPE_LABELS: Readonly<Record<string, string>> = {
  depot: t('Depósito'),
  delivery: t('Entrega'),
  pickup: t('Recogida'),
  service: t('Servicio'),
};

const label = (labels: Readonly<Record<string, string>>, key: string | null): string =>
  key === null ? '' : (labels[key] ?? key);

export const journeyStatusLabel = (key: string | null): string => label(JOURNEY_STATUS_LABELS, key);
export const stopTypeLabel = (key: string | null): string => label(STOP_TYPE_LABELS, key);

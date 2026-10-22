/** Etiquetas en español de `JourneyStatus`; el gateway también devuelve `planned` y `completed`. */
export const JOURNEY_STATUS_LABELS: Readonly<Record<string, string>> = {
  planning: 'En planificación',
  planned: 'Planificada',
  in_progress: 'En curso',
  completed: 'Completada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
};

/** Etiquetas en español de `StopType`. */
export const STOP_TYPE_LABELS: Readonly<Record<string, string>> = {
  depot: 'Depósito',
  delivery: 'Entrega',
  pickup: 'Recogida',
  service: 'Servicio',
};

const label = (labels: Readonly<Record<string, string>>, key: string | null): string => (key === null ? '' : (labels[key] ?? key));

export const journeyStatusLabel = (key: string | null): string => label(JOURNEY_STATUS_LABELS, key);
export const stopTypeLabel = (key: string | null): string => label(STOP_TYPE_LABELS, key);

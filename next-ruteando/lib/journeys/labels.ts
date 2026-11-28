import type { TFunction } from '@/lib/i18n/core';

/** Estados de `JourneyStatus` que conoce la aplicación, en su orden (el gateway también devuelve `planned` y `completed`). */
export const JOURNEY_STATUS_KEYS = ['planning', 'planned', 'in_progress', 'completed', 'failed', 'cancelled'] as const;

const pick = (labels: Record<string, string>, key: string | null) => (key === null ? '' : (labels[key] ?? key));

export const journeyStatusLabel = (key: string | null, t: TFunction) =>
  pick(
    {
      planning: t('En planificación'),
      planned: t('Planificada'),
      in_progress: t('En curso'),
      completed: t('Completada'),
      failed: t('Fallida'),
      cancelled: t('Cancelada'),
    },
    key
  );

export const stopTypeLabel = (key: string | null, t: TFunction) =>
  pick({ depot: t('Depósito'), delivery: t('Entrega'), pickup: t('Recogida'), service: t('Servicio') }, key);

/** Estados en el orden de la aplicación y al final cualquiera desconocido que traigan las jornadas. */
export function journeyStatusOrder(rows: readonly { status: string }[]): string[] {
  const known: string[] = [...JOURNEY_STATUS_KEYS];
  return [...known, ...[...new Set(rows.map((j) => j.status))].filter((key) => !known.includes(key))];
}

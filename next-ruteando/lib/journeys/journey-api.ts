import { toPlannedJourney } from '@/lib/api/journey-mapper';
import type { Journey, JourneyPlanRequest, PlannedJourney } from '@/lib/api/models';
import { getData, requestJson } from '@/lib/api-client';
import type { TFunction } from '@/lib/i18n/core';

/** Una jornada con sus rutas ya en el modelo de dominio (`geometry`, `LatLng`). */
export const getJourney = async (id: string, t: TFunction): Promise<PlannedJourney> =>
  toPlannedJourney(await getData<Journey>(`journeys/${encodeURIComponent(id)}`, t));

/** Planifica una jornada: la planificación es del servidor, que recibe la configuración y los ids de los paquetes. */
export const planJourney = async (
  request: JourneyPlanRequest,
  t: TFunction,
  messages?: Parameters<typeof requestJson>[4]
): Promise<PlannedJourney> =>
  toPlannedJourney(await requestJson<Journey>('POST', '/middleware/data/journeys/plan', request, t, messages));

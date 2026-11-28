import type { TFunction } from '@/lib/i18n/core';

/** Los valores de cada dominio que conoce la aplicación, en su orden (y para pintar los selectores antes de cargar el gateway). */
export const DEFAULT_ROUTE_TOPOLOGIES = ['depot_to_depot', 'round_trip', 'open_delivery', 'open_pickup', 'flexible'];
export const DEFAULT_RESTRICTION_TYPES = ['fixed_routes', 'resource_vs_time', 'time_windows'];
export const DEFAULT_LENGTH_OF_STAY_TYPES = ['fixed', 'define_itinerary'];

export const FIXED_ROUTES = 'fixed_routes';
export const FIXED_STAY = 'fixed';

const pick = (labels: Record<string, string>, key: string | null) => (key === null ? '' : (labels[key] ?? key));

export const routeTopologyLabel = (key: string | null, t: TFunction) =>
  pick(
    {
      depot_to_depot: t('Del depósito al depósito'),
      round_trip: t('Ida y vuelta'),
      open_delivery: t('Entrega abierta'),
      open_pickup: t('Recogida abierta'),
      flexible: t('Flexible'),
    },
    key
  );

export const restrictionTypeLabel = (key: string | null, t: TFunction) =>
  pick(
    { fixed_routes: t('Rutas fijas'), resource_vs_time: t('Recursos y tiempo'), time_windows: t('Ventanas horarias') },
    key
  );

export const lengthOfStayLabel = (key: string | null, t: TFunction) =>
  pick({ fixed: t('Fija'), define_itinerary: t('Definida en el itinerario') }, key);

/** Lo que el formulario sabe de la configuración mientras se edita, para describirla en una frase. */
export interface SettingsSummary {
  restrictionType: string;
  routeTopology: string;
  fixedRoutes: number | null;
  shiftDurationMin: number | null;
  placeStartName: string | null;
  placeEndName: string | null;
  vehicleCount: number;
  evaluateWeight: boolean;
  evaluateVolume: boolean;
  evaluateItineraryZone: boolean;
}

/** «8 h», «1 h 30 min» o «45 min». */
function duration(minutes: number, t: TFunction): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return hours === 0 ? t('{0} min', [rest]) : rest === 0 ? t('{0} h', [hours]) : t('{0} h {1} min', [hours, rest]);
}

/** «peso», «peso y volumen» o «peso, volumen y zona del itinerario». */
function list(items: string[], t: TFunction): string {
  return items.length <= 1 ? items.join('') : t('{0} y {1}', [items.slice(0, -1).join(', '), items[items.length - 1]!]);
}

/**
 * La configuración en una frase («Planificará 3 rutas (ida y vuelta) desde Depósito central, con 3 vehículos, evaluando peso y
 * volumen.»). Solo da formato a lo que hay en el formulario: no calcula ni decide nada, y lo que falta simplemente no se dice.
 */
export function describeSettings(s: SettingsSummary, t: TFunction): string {
  let routes = t('rutas');
  if (
    s.restrictionType === FIXED_ROUTES &&
    s.fixedRoutes !== null &&
    Number.isInteger(s.fixedRoutes) &&
    s.fixedRoutes >= 1
  ) {
    routes = s.fixedRoutes === 1 ? t('1 ruta') : t('{0} rutas', [s.fixedRoutes]);
  } else if (s.restrictionType === 'resource_vs_time') {
    routes =
      s.shiftDurationMin !== null && s.shiftDurationMin > 0
        ? t('rutas con turnos de {0}', [duration(s.shiftDurationMin, t)])
        : t('rutas según recursos y tiempo');
  } else if (s.restrictionType === 'time_windows') {
    routes = t('rutas con ventanas horarias');
  }
  let text = t('Planificará {0}', [routes]);
  if (s.routeTopology) text += ` (${routeTopologyLabel(s.routeTopology, t).toLowerCase()})`;
  if (s.placeStartName) {
    text += t(' desde {0}', [s.placeStartName]);
    if (s.placeEndName && s.placeEndName !== s.placeStartName) text += t(' hasta {0}', [s.placeEndName]);
  }
  if (s.vehicleCount > 0) {
    text += s.vehicleCount === 1 ? t(', con 1 vehículo') : t(', con {0} vehículos', [s.vehicleCount]);
  }
  const evaluated = [
    s.evaluateWeight && t('peso'),
    s.evaluateVolume && t('volumen'),
    s.evaluateItineraryZone && t('zona del itinerario'),
  ].filter((x): x is string => !!x);
  if (evaluated.length > 0) text += t(', evaluando {0}', [list(evaluated, t)]);
  return `${text}.`;
}

import { t } from '../../core/i18n/i18n';
/** Etiquetas en español de `RouteTopology`. */
export const ROUTE_TOPOLOGY_LABELS: Readonly<Record<string, string>> = {
  depot_to_depot: t('Del depósito al depósito'),
  round_trip: t('Ida y vuelta'),
  open_delivery: t('Entrega abierta'),
  open_pickup: t('Recogida abierta'),
  flexible: t('Flexible'),
};

/** Etiquetas en español de `RestrictionType`. */
export const RESTRICTION_TYPE_LABELS: Readonly<Record<string, string>> = {
  fixed_routes: t('Rutas fijas'),
  resource_vs_time: t('Recursos y tiempo'),
  time_windows: t('Ventanas horarias'),
};

/** Etiquetas en español de `TypeLengthOfStay`. */
export const LENGTH_OF_STAY_LABELS: Readonly<Record<string, string>> = {
  fixed: t('Fija'),
  define_itinerary: t('Definida en el itinerario'),
};

/** Valores habituales para pintar los selectores antes de cargar los dominios del gateway. */
export const DEFAULT_ROUTE_TOPOLOGIES = Object.keys(ROUTE_TOPOLOGY_LABELS);
export const DEFAULT_RESTRICTION_TYPES = Object.keys(RESTRICTION_TYPE_LABELS);
export const DEFAULT_LENGTH_OF_STAY_TYPES = Object.keys(LENGTH_OF_STAY_LABELS);

const label = (labels: Readonly<Record<string, string>>, key: string | null): string => (key === null ? '' : (labels[key] ?? key));

export const routeTopologyLabel = (key: string | null): string => label(ROUTE_TOPOLOGY_LABELS, key);
export const restrictionTypeLabel = (key: string | null): string => label(RESTRICTION_TYPE_LABELS, key);
export const lengthOfStayLabel = (key: string | null): string => label(LENGTH_OF_STAY_LABELS, key);

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
function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return hours === 0 ? t('{0} min', [rest]) : rest === 0 ? t('{0} h', [hours]) : t('{0} h {1} min', [hours, rest]);
}

/** «peso», «peso y volumen» o «peso, volumen y zona del itinerario». */
function list(items: string[]): string {
  return items.length <= 1 ? items.join('') : t('{0} y {1}', [items.slice(0, -1).join(', '), items[items.length - 1]]);
}

/**
 * La configuración en una frase («Planificará 3 rutas (ida y vuelta) desde Depósito central, con 3 vehículos, evaluando peso y
 * volumen.»). Solo da formato a lo que hay en el formulario: no calcula ni decide nada, y lo que falta simplemente no se dice.
 */
export function describeSettings(s: SettingsSummary): string {
  let routes = t('rutas');
  if (s.restrictionType === 'fixed_routes' && s.fixedRoutes !== null && Number.isInteger(s.fixedRoutes) && s.fixedRoutes >= 1) {
    routes = s.fixedRoutes === 1 ? t('1 ruta') : t('{0} rutas', [s.fixedRoutes]);
  } else if (s.restrictionType === 'resource_vs_time') {
    routes = s.shiftDurationMin !== null && s.shiftDurationMin > 0 ? t('rutas con turnos de {0}', [duration(s.shiftDurationMin)]) : t('rutas según recursos y tiempo');
  } else if (s.restrictionType === 'time_windows') {
    routes = t('rutas con ventanas horarias');
  }
  let text = t('Planificará {0}', [routes]);
  if (s.routeTopology) {
    text += ` (${routeTopologyLabel(s.routeTopology).toLowerCase()})`;
  }
  if (s.placeStartName) {
    text += t(' desde {0}', [s.placeStartName]);
    if (s.placeEndName && s.placeEndName !== s.placeStartName) {
      text += t(' hasta {0}', [s.placeEndName]);
    }
  }
  if (s.vehicleCount > 0) {
    text += s.vehicleCount === 1 ? t(', con 1 vehículo') : t(', con {0} vehículos', [s.vehicleCount]);
  }
  const evaluated = [s.evaluateWeight && t('peso'), s.evaluateVolume && t('volumen'), s.evaluateItineraryZone && t('zona del itinerario')].filter((x): x is string => !!x);
  if (evaluated.length > 0) {
    text += t(', evaluando {0}', [list(evaluated)]);
  }
  return `${text}.`;
}

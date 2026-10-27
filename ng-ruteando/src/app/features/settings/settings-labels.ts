/** Etiquetas en español de `RouteTopology`. */
export const ROUTE_TOPOLOGY_LABELS: Readonly<Record<string, string>> = {
  depot_to_depot: 'Del depósito al depósito',
  round_trip: 'Ida y vuelta',
  open_delivery: 'Entrega abierta',
  open_pickup: 'Recogida abierta',
  flexible: 'Flexible',
};

/** Etiquetas en español de `RestrictionType`. */
export const RESTRICTION_TYPE_LABELS: Readonly<Record<string, string>> = {
  fixed_routes: 'Rutas fijas',
  resource_vs_time: 'Recursos y tiempo',
  time_windows: 'Ventanas horarias',
};

/** Etiquetas en español de `TypeLengthOfStay`. */
export const LENGTH_OF_STAY_LABELS: Readonly<Record<string, string>> = {
  fixed: 'Fija',
  define_itinerary: 'Definida en el itinerario',
};

/** Valores habituales para pintar los selectores antes de cargar los dominios del gateway. */
export const DEFAULT_ROUTE_TOPOLOGIES = Object.keys(ROUTE_TOPOLOGY_LABELS);
export const DEFAULT_RESTRICTION_TYPES = Object.keys(RESTRICTION_TYPE_LABELS);
export const DEFAULT_LENGTH_OF_STAY_TYPES = Object.keys(LENGTH_OF_STAY_LABELS);

const label = (labels: Readonly<Record<string, string>>, key: string | null): string => (key === null ? '' : (labels[key] ?? key));

export const routeTopologyLabel = (key: string | null): string => label(ROUTE_TOPOLOGY_LABELS, key);
export const restrictionTypeLabel = (key: string | null): string => label(RESTRICTION_TYPE_LABELS, key);
export const lengthOfStayLabel = (key: string | null): string => label(LENGTH_OF_STAY_LABELS, key);

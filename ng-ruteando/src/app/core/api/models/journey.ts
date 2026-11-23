import { LatLng } from '../../geo/lat-lng';
import { SettingsResourceSummary } from './settings';

export interface JourneySettingsSummary {
  id: string;
  name: string;
  routeTopology: string;
  restrictionType: string;
}

export interface JourneyStats {
  minTime: number;
  avgTime: number;
  maxTime: number;
}

/** Parada de una ruta, tal como la devuelve el gateway: `coordinates` es `[longitud, latitud]`. */
export interface Waypoint {
  sequence: number;
  /** Dominio maestro `StopType`: `depot`, `delivery`, `pickup` o `service`. */
  stopType: string;
  packageId: string | null;
  packageInfo: unknown;
  placeId: string | null;
  coordinates: [number, number];
  arrivalUtc: string | null;
  departureUtc: string | null;
  distance: number | null;
  distanceAccum: number | null;
  duration: number | null;
  durationAccum: number | null;
  weight: number | null;
  weightAccum: number | null;
  volume: number | null;
  volumeAccum: number | null;
}

/** Ruta tal como la devuelve el gateway: `geoJson` NO es GeoJSON, es una polilínea codificada de precisión 5. */
export interface JourneyRoute {
  routeIndex: number;
  name: string;
  resourceId: string | null;
  resource: SettingsResourceSummary | null;
  geoJson: string | null;
  startRouteUtc: string | null;
  finishRouteUtc: string | null;
  distanceTraveled: number | null;
  duration: number | null;
  weightUsed: number | null;
  volumeUsed: number | null;
  weightUsagePercent: number | null;
  volumeUsagePercent: number | null;
  fuelCost: number | null;
  avgStayTime: number | null;
  legsCount: number | null;
  badPackageIds: string[] | null;
  waypoints: Waypoint[];
}

/** Jornada tal como la devuelve el gateway. En los listados `routes` es `null`. */
export interface Journey {
  id: string;
  tenantId: string;
  createdBy: string | null;
  settingsId: string;
  settings: JourneySettingsSummary | null;
  name: string;
  /** Dominio maestro `JourneyStatus` (el gateway también devuelve `planned` y `completed`). */
  status: string;
  totalServices: number | null;
  totalResources: number | null;
  totalZones: number | null;
  stats: JourneyStats | null;
  invalidPackageIds: string[] | null;
  routes: JourneyRoute[] | null;
  resourceSummary: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyPlanRequest {
  settingsId: string;
  packageIds: string[];
  name: string;
}

export interface JourneyMetrics {
  id: string | { date: string; timestamp: number };
  tenantId: string | { date: string; timestamp: number };
  journeyId: string | { date: string; timestamp: number };
  distance: number | null;
  efficiency: number | null;
  weightAccum: number | null;
  volumeAccum: number | null;
  avgAttendWeightPct: number | null;
  avgAttendVolumePct: number | null;
  attendServicesPct: number | null;
  attendedRoutes: number | null;
  attendedServices: number | null;
  totalServices: number;
  usedResources: number | null;
  totalResources: number | null;
  attendedCustomers: number | null;
  createdAt: string | null;
}

/** Identificador serializado por el gateway como objeto (defecto del backend): se trata como opaco. */
export interface OpaqueObjectId {
  date: string;
  timestamp: number;
}

export interface JourneyNavigation {
  id: OpaqueObjectId;
  tenantId: OpaqueObjectId;
  journeyId: OpaqueObjectId;
  routeIndex: number;
  osrmVersion: string;
  instructionsLegacy: unknown[];
  viaPointsLegacy: unknown[];
  legs: unknown;
  snappedWaypoints: unknown;
  createdAt: string | null;
}

// ---------------------------------------------------------------- modelo de dominio

export interface DomainWaypoint extends Omit<Waypoint, 'coordinates'> {
  /** Posición ya como coordenada de dominio; `null` si el gateway envió una inválida. */
  position: LatLng | null;
}

/** Ruta para la UI: la geometría ya está decodificada (`geometry`) y las paradas llevan `LatLng`. */
export interface DomainRoute extends Omit<JourneyRoute, 'geoJson' | 'waypoints'> {
  geometry: LatLng[];
  waypoints: DomainWaypoint[];
}

export interface PlannedJourney extends Omit<Journey, 'routes'> {
  routes: DomainRoute[];
}

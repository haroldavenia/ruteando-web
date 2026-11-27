import type { GeoJsonPoint, LatLng } from '@/lib/map/lat-lng';
import type { UserRole } from '@/lib/session-token';

type Opaque = Record<string, unknown> | null;

// ---------------------------------------------------------------- flota

export interface ResourceTypeSummary {
  id: string;
  name: string;
  capacity: Opaque;
  osrmProfile: string;
}

export interface AssignedUserSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface ResourceType {
  id: string;
  tenantId: string;
  /** Categoría del tipo de recurso (`van`, `truck`...). */
  category: string;
  name: string;
  /** Perfil de ruteo del dominio maestro `OsrmProfile` (`driving`, `cycling`, `walking`). */
  osrmProfile: string;
  capacity: Opaque;
  measure: Opaque;
  restriction: Opaque;
  gasMileage: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceTypeInput {
  category: string;
  name: string;
  osrmProfile: string;
  capacity?: Opaque;
  measure?: Opaque;
  restriction?: Opaque;
  gasMileage?: number | null;
}

/** Vehículo o recurso de reparto. */
export interface Resource {
  id: string;
  tenantId: string;
  resourceTypeId: string;
  driverId: string | null;
  name: string;
  licensePlate: string | null;
  depotId: string;
  /** Inicio de turno (ISO 8601 UTC). */
  shiftStartUtc: string;
  shiftDurationSec: number;
  breakDurationSec: number;
  quantity: number;
  default: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  allowedPackageTypes: string[] | null;
  allowedZoneIds: string[] | null;
  resourceType: ResourceTypeSummary | null;
  assignedUser: AssignedUserSummary | null;
}

export interface ResourceInput {
  name: string;
  resourceTypeId: string;
  depotId: string;
  shiftStartUtc: string;
  shiftDurationSec: number;
  breakDurationSec: number;
  licensePlate?: string | null;
  quantity?: number;
  allowedPackageTypes?: string[] | null;
  allowedZoneIds?: string[] | null;
}

/** Usuario del tenant; los conductores son usuarios con rol `driver`. */
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: UserRole;
  tenantId: string;
  createdAt: string;
  active: boolean;
  identifierType: string | null;
  identifierValue: string | null;
  avatar: string | null;
  lastLoginAt: string | null;
  updatedAt: string | null;
}

export interface UserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string | null;
  identifierType?: string | null;
  identifierValue?: string | null;
}

// ---------------------------------------------------------------- lugares, zonas, paquetes

export interface Place {
  id: string;
  tenantId: string;
  name: string;
  /** Código del dominio maestro `PlaceType` (`depot`, `warehouse`, `store`...). */
  type: string;
  address: string | null;
  location: GeoJsonPoint;
  phoneNumber: string | null;
  contactName: string | null;
  zoneId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceInput {
  name: string;
  type: string;
  location: GeoJsonPoint;
  address?: string | null;
  phoneNumber?: string | null;
  contactName?: string | null;
  zoneId?: string | null;
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  /** Anillos de `[longitud, latitud]`; el primero es el contorno exterior. */
  coordinates: number[][][];
}

export interface Zone {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  boundary: GeoJsonPolygon;
  color: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneInput {
  name: string;
  code: string;
  boundary: GeoJsonPolygon;
  color?: string | null;
}

/** Paquete o servicio a atender. */
export interface Package {
  id: string;
  tenantId: string;
  guideNumber: string | null;
  name: string;
  /** Dominio maestro `ServiceType`: `pickup`, `delivery` o `mixed`. */
  serviceType: string;
  address: string;
  standardizedAddress: string | null;
  location: GeoJsonPoint;
  geocodingScore: number | null;
  geocodingStatus: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  zoneId: string | null;
  weight: number;
  volume: number;
  pieceNumber: number;
  measure: unknown;
  durationStay: number | null;
  timeWindow: unknown;
  category: string | null;
  goodsTags: string[] | null;
  customerId: string | null;
  receiver: unknown;
  sender: unknown;
  observation: string | null;
  /** Dominio maestro `PackageStatus`: `pending`, `attended`, `unattended`, `cancelled`, `returned`... */
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackageInput {
  name: string;
  serviceType: string;
  address: string;
  location: GeoJsonPoint;
  weight: number;
  volume: number;
  /** Único por tenant: con `null` el gateway responde 409 `CONFLICT` al crear el segundo paquete. */
  guideNumber?: string | null;
  pieceNumber?: number;
  durationStay?: number | null;
  observation?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

// ---------------------------------------------------------------- configuraciones y jornadas

export interface SettingsPlaceSummary {
  id: string;
  name: string;
  location: GeoJsonPoint;
}

export interface SettingsResourceSummary {
  id: string;
  name: string;
  plate: string | null;
  resourceTypeName: string;
}

/** Configuración de optimización de una jornada. */
export interface Settings {
  id: string;
  tenantId: string;
  description: string;
  routeTopology: string;
  restrictionType: string;
  placeStartId: string;
  placeEndId: string;
  evaluateWeight: boolean;
  evaluateVolume: boolean;
  evaluateItineraryZone: boolean;
  fixedRoutes: number | null;
  lengthOfStay: number | null;
  typeLengthOfStay: string | null;
  shiftStartUtc: string | null;
  shiftDurationSec: number | null;
  breakDurationSec: number | null;
  resourceIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  globalShiftActive: boolean;
  globalBreakActive: boolean;
  placeStart: SettingsPlaceSummary | null;
  placeEnd: SettingsPlaceSummary | null;
  resources: SettingsResourceSummary[];
}

export interface SettingsInput {
  description: string;
  routeTopology: string;
  restrictionType: string;
  /** La pantalla de configuraciones no asigna flota: solo se reenvía la que el registro ya tenía. */
  resourceIds?: string[];
  placeStartId: string;
  placeEndId?: string;
  fixedRoutes?: number | null;
  evaluateWeight?: boolean;
  evaluateVolume?: boolean;
  evaluateItineraryZone?: boolean;
  lengthOfStay?: number | null;
  typeLengthOfStay?: string | null;
  shiftStartUtc?: string | null;
  shiftDurationSec?: number | null;
  breakDurationSec?: number | null;
}

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

/** Parada de una ruta: `coordinates` es `[longitud, latitud]`. */
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

/** Ruta: `geoJson` NO es GeoJSON, es una polilínea codificada de precisión 5. */
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

/** Jornada. En los listados `routes` es `null`. */
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

export interface DomainWaypoint extends Omit<Waypoint, 'coordinates'> {
  /** Posición ya como coordenada de dominio; `null` si el gateway envió una inválida. */
  position: LatLng | null;
}

/** Ruta para la interfaz: la geometría ya está decodificada y las paradas llevan `LatLng`. */
export interface DomainRoute extends Omit<JourneyRoute, 'geoJson' | 'waypoints'> {
  geometry: LatLng[];
  waypoints: DomainWaypoint[];
}

export interface PlannedJourney extends Omit<Journey, 'routes'> {
  routes: DomainRoute[];
}

// ---------------------------------------------------------------- servicios asignados, catálogos, auditoría

export interface AssignedService {
  id: string;
  vehicle: Opaque;
  route: Opaque;
  driver: Opaque;
  /** Estado en el idioma del gateway (`ACTIVO`...). */
  state: string;
  executionDate: string | null;
}

export interface AssignedServiceInput {
  state: string;
  vehicle?: Opaque;
  route?: Opaque;
  driver?: Opaque;
  executionDate?: string | null;
}

export interface MasterDomainValue {
  key: string;
  label: string;
  description: string | null;
  sortOrder: number | null;
  active: boolean;
}

/** Catálogo de valores del gateway (`RouteTopology`, `PackageStatus`, `PlaceType`...). */
export interface MasterDomain {
  id: string;
  code: string;
  description: string;
  /** `true` en los dominios propios del sistema. */
  system: boolean;
  values: MasterDomainValue[];
}

export interface MasterDomainValueInput {
  key: string;
  label: string;
  description?: string | null;
  sortOrder?: number | null;
}

export type AuditValues = Record<string, unknown>;

export interface AuditChanges {
  before?: AuditValues | null;
  after?: AuditValues | null;
}

/** Evento de auditoría: `action` es una clave (`package.status.change`) y `entityType` el tipo de lo afectado. */
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  changes: AuditChanges | null;
  /** Instante ISO (UTC). */
  createdAt: string;
  ipAddress?: string | null;
}

/** Resultado de ubicar una dirección: los mismos valores que el dominio `GeocodingStatus` del gateway. */
export type GeocodeStatus = 'match' | 'mean' | 'manual' | 'unmatch';

/** Lo que se le pide al geocodificador: la dirección y, si se sabe, la ciudad y el país. */
export interface GeocodeQuery {
  address: string;
  city?: string | null;
  country?: string | null;
}

/** Resultado normalizado de `POST /geocoding`, ya en el dominio (`LatLng`, no el formato del gateway). */
export interface GeocodeResult {
  /** `match`: ubicada; `mean`: aproximada; `unmatch`: no se encontró. */
  status: 'match' | 'mean' | 'unmatch';
  /** Dirección estandarizada que devolvió el geocodificador. */
  standardizedAddress: string | null;
  location: LatLng | null;
  /** Puntaje entre 0 y 1 (si el gateway lo da en 0 a 100 se normaliza). */
  score: number | null;
}

/** Resultado de `POST /reverse-geocoding`: la dirección más cercana al punto, o `null` si no hay. */
export interface ReverseGeocodeResult {
  address: string | null;
  city: string | null;
  country: string | null;
}

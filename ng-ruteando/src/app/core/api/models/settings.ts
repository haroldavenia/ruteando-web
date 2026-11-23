import { GeoJsonPoint } from '../../geo/lat-lng';

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

/** Configuración de optimización de una jornada (antes `settings` en el legacy). */
export interface Settings {
  id: string;
  tenantId: string;
  description: string;
  /** Dominio maestro `RouteTopology`: `depot_to_depot`, `round_trip`, `open_delivery`... */
  routeTopology: string;
  /** Dominio maestro `RestrictionType`: `fixed_routes`, `resource_vs_time`, `time_windows`. */
  restrictionType: string;
  placeStartId: string;
  placeEndId: string;
  evaluateWeight: boolean;
  evaluateVolume: boolean;
  evaluateItineraryZone: boolean;
  fixedRoutes: number | null;
  lengthOfStay: number | null;
  /** Dominio maestro `TypeLengthOfStay`: `fixed` o `define_itinerary`. */
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
  resourceIds: string[];
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

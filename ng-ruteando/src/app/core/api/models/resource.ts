export interface ResourceTypeSummary {
  id: string;
  name: string;
  capacity: Record<string, unknown> | null;
  osrmProfile: string;
}

export interface AssignedUserSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

/** Vehículo o recurso de reparto (antes `vehicles` en el legacy). */
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

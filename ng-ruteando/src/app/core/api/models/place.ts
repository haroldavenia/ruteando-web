import { GeoJsonPoint } from '../../geo/lat-lng';

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

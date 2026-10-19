import { GeoJsonPoint } from '../../geo/lat-lng';

/** Paquete o servicio a atender (antes un elemento del `itinerary` del legacy); ahora es una entidad persistida. */
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
  /** Dominio maestro `GeocodingStatus`. */
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
}

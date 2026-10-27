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

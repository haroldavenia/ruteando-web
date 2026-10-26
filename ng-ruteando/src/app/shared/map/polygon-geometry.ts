import { LatLng, latLng } from '../../core/geo/lat-lng';

/** Más vértices que esto y no se comprueban los cruces (la comprobación es O(n²)). */
export const MAX_CHECKED_VERTICES = 2000;
/** Kilómetros por grado de arco en la esfera terrestre media. */
const KM_PER_DEGREE = (Math.PI / 180) * 6371.0088;
/** Por debajo de este área (en grados cuadrados, ~0,01 m²) un polígono no encierra superficie. */
const MIN_AREA = 1e-12;

export type PolygonIssue =
  | { kind: 'too-few' }
  | { kind: 'no-area' }
  /** Los lados `a` y `b` (numerados desde 1; el lado `n` cierra el polígono) se cruzan. */
  | { kind: 'self-intersection'; a: number; b: number }
  /** Demasiados vértices para comprobar los cruces. */
  | { kind: 'unchecked' };

type Ring = readonly (readonly number[])[];

/** Vértices de un anillo GeoJSON `[lon, lat]`, sin el último si repite el primero y sin posiciones no válidas. */
export function verticesFromRing(ring: Ring | null | undefined): LatLng[] {
  const vertices = (ring ?? []).flatMap((position) => {
    const point = latLng(position?.[1], position?.[0]);
    return point ? [point] : [];
  });
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  if (vertices.length > 1 && first.lat === last.lat && first.lng === last.lng) {
    vertices.pop();
  }
  return vertices;
}

/** Área con signo en grados cuadrados sobre un plano local (longitud escalada por el coseno de la latitud media); positiva si es antihoraria. */
export function signedArea(vertices: readonly LatLng[]): number {
  if (vertices.length < 3) {
    return 0;
  }
  const meanLat = vertices.reduce((sum, v) => sum + v.lat, 0) / vertices.length;
  const scale = Math.cos((meanLat * Math.PI) / 180);
  let twice = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    twice += a.lng * scale * b.lat - b.lng * scale * a.lat;
  }
  return twice / 2;
}

/** Área aproximada en kilómetros cuadrados. */
export function areaKm2(vertices: readonly LatLng[]): number {
  return Math.abs(signedArea(vertices)) * KM_PER_DEGREE * KM_PER_DEGREE;
}

/** Anillo GeoJSON `[lon, lat]` cerrado (la última posición repite la primera) y en sentido antihorario. */
export function ringFromVertices(vertices: readonly LatLng[]): [number, number][] {
  const ordered = signedArea(vertices) < 0 ? [...vertices].reverse() : [...vertices];
  const ring = ordered.map((v): [number, number] => [v.lng, v.lat]);
  if (ring.length > 0) {
    ring.push([...ring[0]] as [number, number]);
  }
  return ring;
}

const cross = (o: LatLng, a: LatLng, b: LatLng): number => (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
const within = (v: number, a: number, b: number): boolean => v >= Math.min(a, b) && v <= Math.max(a, b);

/** `true` si los segmentos `p1-p2` y `p3-p4` se cortan o se tocan (incluido el solape colineal). */
export function segmentsIntersect(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  const onSegment = (a: LatLng, b: LatLng, c: LatLng, d: number) => d === 0 && within(c.lng, a.lng, b.lng) && within(c.lat, a.lat, b.lat);
  return onSegment(p3, p4, p1, d1) || onSegment(p3, p4, p2, d2) || onSegment(p1, p2, p3, d3) || onSegment(p1, p2, p4, d4);
}

/** Motivos por los que un polígono no es válido (lista vacía si lo es). */
export function validatePolygon(vertices: readonly LatLng[]): PolygonIssue[] {
  const distinct = new Set(vertices.map((v) => `${v.lat},${v.lng}`)).size;
  if (distinct < 3) {
    return [{ kind: 'too-few' }];
  }
  const issues: PolygonIssue[] = [];
  const flat = Math.abs(signedArea(vertices)) < MIN_AREA;
  if (vertices.length > MAX_CHECKED_VERTICES) {
    return [...(flat ? [{ kind: 'no-area' } as const] : []), { kind: 'unchecked' }];
  }
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (!adjacent && segmentsIntersect(vertices[i], vertices[(i + 1) % n], vertices[j], vertices[(j + 1) % n])) {
        issues.push({ kind: 'self-intersection', a: i + 1, b: j + 1 });
      }
    }
  }
  // Una pajarita tiene área con signo cero porque sus dos lóbulos se compensan: el cruce es el motivo real
  if (flat && issues.length === 0) {
    issues.push({ kind: 'no-area' });
  }
  return issues;
}

/** Es válido si no hay ningún motivo que lo impida (el aviso de «sin comprobar» no lo invalida). */
export function isValidPolygon(vertices: readonly LatLng[]): boolean {
  return validatePolygon(vertices).every((issue) => issue.kind === 'unchecked');
}

export function polygonIssueMessage(issue: PolygonIssue): string {
  switch (issue.kind) {
    case 'too-few':
      return 'Hacen falta al menos tres vértices distintos';
    case 'no-area':
      return 'El polígono no encierra ninguna superficie: los vértices están alineados';
    case 'self-intersection':
      return `Los lados ${issue.a} y ${issue.b} se cruzan`;
    case 'unchecked':
      return `Hay más de ${MAX_CHECKED_VERTICES} vértices: no se comprueba si algún lado se cruza`;
  }
}

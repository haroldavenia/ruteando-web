import { LatLng } from '../../core/geo/lat-lng';

import {
  areaKm2,
  isValidPolygon,
  polygonIssueMessage,
  ringFromVertices,
  segmentsIntersect,
  signedArea,
  validatePolygon,
  verticesFromRing,
} from './polygon-geometry';

import create from '../../../testing/fixtures/gateway/post__zones.json';

const ring = (create.request.body as { boundary: { coordinates: number[][][] } }).boundary.coordinates[0];
const square: LatLng[] = [
  { lat: 4.5, lng: -74.1 },
  { lat: 4.5, lng: -74.0 },
  { lat: 4.7, lng: -74.0 },
  { lat: 4.7, lng: -74.1 },
];
const v = (lat: number, lng: number): LatLng => ({ lat, lng });

describe('polygon-geometry', () => {
  describe('anillo y vértices', () => {
    it('el anillo del fixture real tiene cuatro vértices distintos sin el cierre', () => {
      expect(ring.length).toBe(5);
      expect(verticesFromRing(ring)).toEqual(square);
    });

    it('un anillo sin cierre también se lee entero', () => {
      expect(verticesFromRing(ring.slice(0, 4))).toEqual(square);
    });

    it('descarta posiciones no válidas y tolera null', () => {
      expect(verticesFromRing([[-74, 4.5], [999, 4], [-74, 4.6], [-73.9, 4.7]]).length).toBe(3);
      expect(verticesFromRing(null)).toEqual([]);
      expect(verticesFromRing([])).toEqual([]);
    });

    it('ringFromVertices cierra el anillo: cuatro vértices dan cinco posiciones y la última repite la primera', () => {
      const out = ringFromVertices(square);
      expect(out.length).toBe(5);
      expect(out[4]).toEqual(out[0]);
      expect(out).toEqual(ring as [number, number][]);
    });

    it('un polígono horario se entrega antihorario sin cambiar su forma', () => {
      const clockwise = [...square].reverse();
      expect(signedArea(clockwise)).toBeLessThan(0);
      const out = ringFromVertices(clockwise);
      expect(signedArea(verticesFromRing(out))).toBeGreaterThan(0);
      expect(new Set(out.map((p) => p.join()))).toEqual(new Set(ring.map((p) => p.join())));
    });

    it('vertices → anillo → vertices devuelve los mismos vértices', () => {
      expect(verticesFromRing(ringFromVertices(square))).toEqual(square);
    });

    it('sin vértices el anillo está vacío', () => {
      expect(ringFromVertices([])).toEqual([]);
    });
  });

  describe('área', () => {
    it('el cuadrado del fixture mide unos 247 km²', () => {
      expect(areaKm2(square)).toBeGreaterThan(245);
      expect(areaKm2(square)).toBeLessThan(249);
    });

    it('no depende del sentido', () => {
      expect(areaKm2([...square].reverse())).toBeCloseTo(areaKm2(square), 6);
    });

    it('el signo es positivo en sentido antihorario', () => {
      expect(signedArea(square)).toBeGreaterThan(0);
    });

    it('con menos de tres vértices es cero', () => {
      expect(signedArea([v(0, 0), v(1, 1)])).toBe(0);
      expect(areaKm2([])).toBe(0);
    });
  });

  describe('validatePolygon', () => {
    it('el cuadrado es válido', () => {
      expect(validatePolygon(square)).toEqual([]);
      expect(isValidPolygon(square)).toBeTrue();
    });

    it('con menos de tres vértices distintos hacen falta más', () => {
      expect(validatePolygon([])).toEqual([{ kind: 'too-few' }]);
      expect(validatePolygon([v(4.5, -74), v(4.6, -74)])).toEqual([{ kind: 'too-few' }]);
      expect(validatePolygon([v(4.5, -74), v(4.6, -74), v(4.5, -74)])).toEqual([{ kind: 'too-few' }]);
    });

    it('tres vértices distintos son suficientes', () => {
      expect(validatePolygon([v(4.5, -74.1), v(4.5, -74), v(4.6, -74.05)])).toEqual([]);
    });

    it('vértices alineados no encierran superficie', () => {
      expect(validatePolygon([v(4.5, -74), v(4.6, -74), v(4.7, -74)]).map((i) => i.kind)).toContain('no-area');
      expect(isValidPolygon([v(4.5, -74), v(4.6, -74), v(4.7, -74)])).toBeFalse();
    });

    it('una pajarita tiene los lados 1 y 3 cruzados', () => {
      const bowtie = [v(0, 0), v(1, 1), v(1, 0), v(0, 1)];
      expect(validatePolygon(bowtie)).toEqual([{ kind: 'self-intersection', a: 1, b: 3 }]);
    });

    it('los lados contiguos que comparten un vértice no cuentan como cruce, ni el último con el primero', () => {
      expect(validatePolygon([v(0, 0), v(0, 2), v(2, 2), v(2, 0)])).toEqual([]);
    });

    it('un polígono cóncavo (forma de L) es válido', () => {
      const l = [v(0, 0), v(0, 2), v(1, 2), v(1, 1), v(2, 1), v(2, 0)];
      expect(validatePolygon(l)).toEqual([]);
    });

    it('un vértice que toca un lado no contiguo invalida el polígono', () => {
      const touching = [v(0, 0), v(0, 4), v(4, 4), v(4, 0), v(2, 0), v(2, 4)];
      expect(validatePolygon(touching).some((i) => i.kind === 'self-intersection')).toBeTrue();
    });

    it('con más de 2000 vértices avisa de que no comprueba los cruces pero no lo invalida', () => {
      const many = Array.from({ length: 2001 }, (_, i) => v(4.5 + 0.1 * Math.sin((2 * Math.PI * i) / 2001), -74 + 0.1 * Math.cos((2 * Math.PI * i) / 2001)));
      const issues = validatePolygon(many);
      expect(issues).toEqual([{ kind: 'unchecked' }]);
      expect(isValidPolygon(many)).toBeTrue();
    });

    it('los mensajes están en español y nombran los lados', () => {
      expect(polygonIssueMessage({ kind: 'too-few' })).toContain('al menos tres vértices');
      expect(polygonIssueMessage({ kind: 'self-intersection', a: 1, b: 3 })).toBe('Los lados 1 y 3 se cruzan');
      expect(polygonIssueMessage({ kind: 'no-area' })).toContain('alineados');
      expect(polygonIssueMessage({ kind: 'unchecked' })).toContain('2000');
    });
  });

  describe('segmentsIntersect', () => {
    it('segmentos que se cruzan', () => {
      expect(segmentsIntersect(v(0, 0), v(2, 2), v(0, 2), v(2, 0))).toBeTrue();
    });
    it('segmentos separados', () => {
      expect(segmentsIntersect(v(0, 0), v(1, 0), v(0, 1), v(1, 1))).toBeFalse();
    });
    it('segmentos colineales que se solapan o se tocan', () => {
      expect(segmentsIntersect(v(0, 0), v(2, 0), v(1, 0), v(3, 0))).toBeTrue();
      expect(segmentsIntersect(v(0, 0), v(1, 0), v(1, 0), v(2, 0))).toBeTrue();
    });
    it('segmentos colineales separados', () => {
      expect(segmentsIntersect(v(0, 0), v(1, 0), v(2, 0), v(3, 0))).toBeFalse();
    });
  });
});

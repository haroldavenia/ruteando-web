import { DomainWaypoint, Package } from '../../core/api/models';

import {
  NO_FILTERS,
  RouteVisit,
  filterVisits,
  hasFilters,
  normalizeText,
  progressText,
  visitProgress,
  visitStatus,
  visitsOf,
} from './route-visit-filters';

const stop = (sequence: number, packageId: string | null): DomainWaypoint =>
  ({ sequence, stopType: packageId ? 'delivery' : 'depot', packageId, position: null }) as DomainWaypoint;

const visit = (sequence: number, status: string | null, name = 'Paquete', address = 'Calle 1'): RouteVisit => ({
  stop: stop(sequence, `p${sequence}`),
  packageId: `p${sequence}`,
  state: status === null ? 'unavailable' : 'ready',
  pkg: status === null ? null : ({ id: `p${sequence}`, name, address, guideNumber: null, standardizedAddress: null, status } as Package),
});

describe('route-visit-filters', () => {
  it('normalizeText quita acentos y mayúsculas', () => {
    expect(normalizeText('  Avenida ÁLVARO Obregón ')).toBe('avenida alvaro obregon');
  });

  it('visitsOf conserva solo las paradas con paquete y en orden', () => {
    const visits = visitsOf([stop(0, null), stop(1, 'a'), stop(2, 'b')]);
    expect(visits.map((v) => v.packageId)).toEqual(['a', 'b']);
    expect(visits.every((v) => v.state === 'loading')).toBeTrue();
  });

  it('visitStatus es null mientras carga y unavailable si no hay paquete', () => {
    expect(visitStatus({ ...visit(1, 'pending'), state: 'loading' })).toBeNull();
    expect(visitStatus(visit(1, null))).toBe('unavailable');
    expect(visitStatus(visit(1, 'attended'))).toBe('attended');
  });

  describe('filterVisits', () => {
    const visits = [visit(1, 'pending', 'Café Ñandú', 'Calle Mayor'), visit(2, 'attended', 'Tienda', 'Avenida Sur'), visit(3, null)];

    it('sin filtros devuelve todo', () => {
      expect(filterVisits(visits, NO_FILTERS)).toEqual(visits);
    });

    it('filtra por estado, incluido No disponible', () => {
      expect(filterVisits(visits, { status: 'attended', text: '' }).map((v) => v.packageId)).toEqual(['p2']);
      expect(filterVisits(visits, { status: 'unavailable', text: '' }).map((v) => v.packageId)).toEqual(['p3']);
    });

    it('filtra por texto sin acentos ni mayúsculas, en nombre y dirección', () => {
      expect(filterVisits(visits, { status: '', text: 'CAFE ñandu' }).map((v) => v.packageId)).toEqual(['p1']);
      expect(filterVisits(visits, { status: '', text: 'avenida' }).map((v) => v.packageId)).toEqual(['p2']);
    });

    it('combina estado y texto, y puede no dar resultados', () => {
      expect(filterVisits(visits, { status: 'pending', text: 'tienda' })).toEqual([]);
    });
  });

  it('hasFilters ignora el espacio en blanco', () => {
    expect(hasFilters(NO_FILTERS)).toBeFalse();
    expect(hasFilters({ status: '', text: '  ' })).toBeFalse();
    expect(hasFilters({ status: 'pending', text: '' })).toBeTrue();
  });

  describe('avance', () => {
    it('cuenta atendidas sobre el total, con No disponible dentro del total', () => {
      const progress = visitProgress([visit(1, 'attended'), visit(2, 'pending'), visit(3, null), visit(4, 'attended')]);
      expect(progress).toEqual({ attended: 2, total: 4 });
      expect(progressText(progress)).toBe('2 de 4 visitas atendidas');
    });

    it('singular y sin visitas', () => {
      expect(progressText({ attended: 1, total: 1 })).toBe('1 de 1 visita atendida');
      expect(progressText({ attended: 0, total: 0 })).toBe('Esta ruta no tiene visitas');
    });
  });
});

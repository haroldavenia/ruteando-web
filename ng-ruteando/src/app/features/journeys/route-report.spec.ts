import { DomainRoute, DomainWaypoint, Package } from '../../core/api/models';
import {
  averageStay,
  EMPTY_REPORT_DATA,
  reportFileName,
  reportHeader,
  routeSummary,
  stayMinutes,
  visitRows,
  visitTable,
} from './route-report';

const stop = (patch: Partial<DomainWaypoint>): DomainWaypoint =>
  ({
    sequence: 1,
    stopType: 'delivery',
    packageId: 'p1',
    packageInfo: null,
    placeId: null,
    arrivalUtc: '2026-11-25T14:00:00Z',
    departureUtc: '2026-11-25T14:10:00Z',
    distance: 1234.6,
    position: null,
    ...patch,
  }) as DomainWaypoint;

const route = (waypoints: DomainWaypoint[]): DomainRoute =>
  ({
    routeIndex: 0,
    name: 'Ruta 1',
    distanceTraveled: 5900,
    duration: 3600,
    startRouteUtc: '2026-11-25T13:00:00Z',
    waypoints,
  }) as unknown as DomainRoute;

const pkg = (patch: Partial<Package> = {}): Package =>
  ({
    id: 'p1',
    guideNumber: 'G-1',
    name: 'Paquete de Ana',
    address: 'Calle 1 # 2-3',
    standardizedAddress: null,
    city: 'Bogotá',
    zoneId: 'z1',
    status: 'attended',
    ...patch,
  }) as Package;

describe('route-report', () => {
  const data = { packages: new Map([['p1', pkg()]]), zones: new Map([['z1', 'Norte']]) };

  it('una fila por visita, sin el depósito, con el paquete, la zona y el estado en texto', () => {
    const rows = visitRows(route([stop({ sequence: 0, stopType: 'depot', packageId: null }), stop({})]), data);
    expect(rows.length).toBe(1);
    expect(rows[0].slice(0, 7)).toEqual([1, 'Entrega', 'G-1', 'Paquete de Ana', 'Calle 1 # 2-3', 'Bogotá', 'Norte']);
    expect(rows[0][9]).toBe(10);
    expect(rows[0][10]).toBe(1235);
    expect(rows[0][11]).toBe('Atendido');
  });

  it('prefiere la dirección estandarizada', () => {
    const rows = visitRows(route([stop({})]), {
      ...data,
      packages: new Map([['p1', pkg({ standardizedAddress: 'CL 1 2 3' })]]),
    });
    expect(rows[0][4]).toBe('CL 1 2 3');
  });

  it('si el paquete no se pudo leer o no hay datos, esas celdas quedan vacías y la fila se conserva', () => {
    const rows = visitRows(route([stop({})]), { ...EMPTY_REPORT_DATA, packages: new Map([['p1', null]]) });
    expect(rows[0].slice(2, 7)).toEqual([null, null, null, null, null]);
    expect(rows[0][11]).toBeNull();
  });

  it('la cabecera tiene tantas columnas como celdas por fila', () => {
    expect(reportFileName).toBeDefined();
    expect(visitRows(route([stop({})]), data)[0].length).toBe(reportHeader().length);
    expect(visitTable(route([stop({})]), data).name).toBe('Ruta 1');
  });

  it('la estancia son los minutos entre llegada y salida; sin datos o negativa, vacío', () => {
    expect(stayMinutes('2026-11-25T14:00:00Z', '2026-11-25T14:07:30Z')).toBe(7.5);
    expect(stayMinutes(null, '2026-11-25T14:07:30Z')).toBeNull();
    expect(stayMinutes('2026-11-25T14:10:00Z', '2026-11-25T14:00:00Z')).toBeNull();
  });

  it('el promedio de estancia solo cuenta las visitas que lo informan', () => {
    const r = route([
      stop({}),
      stop({ sequence: 2, packageId: 'p2', departureUtc: '2026-11-25T14:30:00Z' }),
      stop({ sequence: 3, packageId: 'p3', arrivalUtc: null }),
    ]);
    expect(averageStay(r)).toBe(20);
    expect(averageStay(route([]))).toBeNull();
  });

  it('el resumen lleva distancia, tiempo, visitas, promedio y hora de salida', () => {
    const summary = routeSummary(route([stop({})]));
    expect(summary.map(([label]) => label)).toEqual([
      'Distancia recorrida:',
      'Tiempo estimado:',
      'Visitas:',
      'Promedio de estancia por visita:',
      'Hora de salida:',
    ]);
    expect(summary[2][1]).toBe('1');
    expect(summary[3][1]).toBe('10 min');
  });

  it('el nombre de archivo no lleva tildes ni caracteres raros y lleva la fecha local', () => {
    expect(reportFileName('Reparto Norte · Ñandú/1', 'xlsx', new Date(2026, 10, 5))).toBe(
      'reparto-norte-nandu-1-2026-11-05.xlsx'
    );
    expect(reportFileName('???', 'pdf', new Date(2026, 0, 2))).toBe('reporte-2026-01-02.pdf');
  });
});

import { describe, expect, test } from 'vitest';

import type { DomainRoute, Package } from '@/lib/api/models';
import { makeFormat } from '@/lib/format';
import { loadReportData } from '@/lib/hooks/use-report-export';
import { sheetNames } from '@/lib/reports/files';
import { averageStay, reportFileName, routeSummary, stayMinutes, visitRows } from '@/lib/reports/route-report';

const t = (key: string, args: readonly (string | number)[] = []) =>
  key.replace(/\{(\d+)\}/g, (_, n) => String(args[Number(n)]));
const format = makeFormat(t, 'es');

const stop = (sequence: number, packageId: string | null, arrival: string | null, departure: string | null) => ({
  sequence,
  stopType: 'delivery',
  packageId,
  arrivalUtc: arrival,
  departureUtc: departure,
  distance: 120.6,
  distanceAccum: null,
  position: null,
});
const route = {
  name: 'Ruta Norte',
  distanceTraveled: 12_345,
  duration: 3700,
  startRouteUtc: '2026-11-01T12:00:00Z',
  waypoints: [
    stop(1, null, null, null),
    stop(2, 'p1', '2026-11-01T12:00:00Z', '2026-11-01T12:10:30Z'),
    stop(3, 'p2', '2026-11-01T12:20:00Z', '2026-11-01T12:25:00Z'),
  ],
} as unknown as DomainRoute;

describe('reportes de ruta', () => {
  test('la estancia son los minutos entre llegada y salida; sin datos o al revés, vacía', () => {
    expect(stayMinutes('2026-11-01T12:00:00Z', '2026-11-01T12:10:30Z')).toBe(10.5);
    expect(stayMinutes(null, '2026-11-01T12:00:00Z')).toBeNull();
    expect(stayMinutes('2026-11-01T12:10:00Z', '2026-11-01T12:00:00Z')).toBeNull();
    expect(averageStay(route)).toBe(7.8);
  });

  test('una fila por visita; lo que no se leyó del paquete queda vacío', () => {
    const pkg = {
      guideNumber: 'G-1',
      name: 'Ana',
      address: 'Calle 1',
      standardizedAddress: null,
      city: 'Bogotá',
      zoneId: 'z1',
      status: 'attended',
    } as Package;
    const rows = visitRows(
      route,
      {
        packages: new Map([
          ['p1', pkg],
          ['p2', null],
        ]),
        zones: new Map([['z1', 'Norte']]),
      },
      t,
      format
    );
    expect(rows).toHaveLength(2); // la parada sin paquete no es una visita
    expect(rows[0]!.slice(0, 7)).toEqual([2, expect.any(String), 'G-1', 'Ana', 'Calle 1', 'Bogotá', 'Norte']);
    expect(rows[0]![9]).toBe(10.5);
    expect(rows[0]![10]).toBe(121);
    expect(rows[1]!.slice(2, 7)).toEqual([null, null, null, null, null]);
    expect(rows[1]![11]).toBeNull();
  });

  test('el resumen del PDF lleva distancia, tiempo, visitas y promedio', () => {
    const summary = routeSummary(route, t, format);
    expect(summary.map(([label]) => label)).toContain('Visitas:');
    expect(summary.find(([label]) => label === 'Visitas:')![1]).toBe('2');
  });

  test('el nombre de archivo es seguro y lleva la fecha local', () => {
    expect(reportFileName('Reparto Ñandú / Norte!', 'xlsx', new Date(2026, 10, 5))).toBe(
      'reparto-nandu-norte-2026-11-05.xlsx'
    );
    expect(reportFileName('???', 'pdf', new Date(2026, 0, 1))).toBe('reporte-2026-01-01.pdf');
  });

  test('los nombres de hoja de Excel son válidos y no se repiten', () => {
    expect(sheetNames(['A/B', 'a/b', '', 'x'.repeat(40)])).toEqual(['A B', 'a b (2)', 'Hoja 3', 'x'.repeat(31)]);
  });

  test('leer los datos tolera paquetes y zonas que fallan y pide cada paquete una sola vez', async () => {
    const asked: string[] = [];
    const data = await loadReportData(
      't1',
      [route, route],
      t,
      (id) => {
        asked.push(id);
        return id === 'p1' ? Promise.resolve({ id } as Package) : Promise.reject(new Error('x'));
      },
      () => Promise.reject(new Error('zonas'))
    );
    expect(asked.sort()).toEqual(['p1', 'p2']);
    expect(data.packages.get('p1')).toMatchObject({ id: 'p1' });
    expect(data.packages.get('p2')).toBeNull();
    expect(data.zones.size).toBe(0);
  });
});

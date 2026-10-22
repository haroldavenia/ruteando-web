import { firstValueFrom, of, throwError } from 'rxjs';

import { Page } from '../../core/api/api-config';
import { Package } from '../../core/api/models';

import { EXPORT_HEADER, EXPORT_PAGE_SIZE, ExportProgress, fetchAllPackages, packagesToCsv } from './package-export';

import list from '../../../testing/fixtures/gateway/get__packages.json';

const first = (list.response.body.content[0]) as unknown as Package;
const pack = (n: number, extra: Partial<Package> = {}): Package => ({ ...first, id: `id${n}`, name: `P${n}`, guideNumber: `G${n}`, ...extra });
const page = (items: Package[], number: number, total: number): Page<Package> => ({
  content: items,
  page: number,
  size: EXPORT_PAGE_SIZE,
  totalElements: total,
  totalPages: Math.ceil(total / EXPORT_PAGE_SIZE),
});

describe('exportación de paquetes', () => {
  describe('packagesToCsv', () => {
    it('usa la cabecera del legacy y una fila por paquete (fixture real)', () => {
      const lines = packagesToCsv([first]).slice(1).split('\r\n');
      expect(lines[0]).toBe(EXPORT_HEADER.join(';'));
      expect(lines[0]).toBe('ID_GUIA;LONGITUD;LATITUD;CIUDAD;PAIS;DIRECCION;DIRECCION ESTANDARIZADA;PRECISION;ESTADO DE GEOCODIFICACION;ESTADO');
      // guía vacía, longitud, latitud, sin ciudad, país ni dirección estandarizada, dirección y estado
      expect(lines[1]).toBe(';-74.07728;4.60872;;;Fixture address;;;;Pendiente');
    });

    it('traduce el estado de geocodificación y protege las fórmulas', () => {
      const csv = packagesToCsv([pack(1, { geocodingStatus: 'match', geocodingScore: 0.95, address: '=HYPERLINK("x")', city: 'Bogotá; D.C.' })]);
      const row = csv.split('\r\n')[1];
      expect(row).toContain(';Ubicada;');
      expect(row).toContain(';0.95;');
      expect(row).toContain(`"'=HYPERLINK(""x"")"`);
      expect(row).toContain('"Bogotá; D.C."');
    });

    it('una ubicación inválida deja longitud y latitud vacías', () => {
      const row = packagesToCsv([pack(1, { location: { type: 'Point', coordinates: [500, 4] } })]).split('\r\n')[1];
      expect(row.split(';').slice(1, 3)).toEqual(['', '']);
    });
  });

  describe('fetchAllPackages', () => {
    it('concatena las páginas en orden y emite el progreso', async () => {
      const pages = [page([pack(1), pack(2)], 0, 450), page([pack(3)], 1, 450), page([pack(4)], 2, 450)];
      const calls: [number, number][] = [];
      const progress: ExportProgress[] = [];
      const items = await firstValueFrom(
        fetchAllPackages((p, s) => {
          calls.push([p, s]);
          return of(pages[p]);
        }, (x) => progress.push(x)),
      );

      expect(items.map((i) => i.name)).toEqual(['P1', 'P2', 'P3', 'P4']);
      expect(calls).toEqual([[0, 200], [1, 200], [2, 200]]);
      expect(progress).toEqual([{ loaded: 2, total: 450 }, { loaded: 3, total: 450 }, { loaded: 4, total: 450 }]);
    });

    it('con una sola página no pide más', async () => {
      const fetchPage = jasmine.createSpy().and.returnValue(of(page([pack(1)], 0, 1)));
      await firstValueFrom(fetchAllPackages(fetchPage, () => undefined));
      expect(fetchPage).toHaveBeenCalledTimes(1);
    });

    it('un fallo en la segunda página corta la exportación', async () => {
      const fetchPage = (p: number) => (p === 0 ? of(page([pack(1)], 0, 450)) : throwError(() => new Error('boom')));
      await expectAsync(firstValueFrom(fetchAllPackages(fetchPage, () => undefined))).toBeRejectedWithError('boom');
    });
  });
});

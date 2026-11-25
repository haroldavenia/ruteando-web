import { firstValueFrom, Observable, of, throwError } from 'rxjs';

import { DomainRoute, Package, Zone } from '../../core/api/models';
import { ReportData } from './route-report';
import { loadReportData } from './route-report-export';

const route = (...ids: (string | null)[]): DomainRoute =>
  ({
    waypoints: ids.map((packageId, i) => ({ sequence: i, packageId, stopType: 'delivery' })),
  }) as unknown as DomainRoute;

const pkg = (id: string) => ({ id, name: id }) as Package;
const zones = [{ id: 'z1', name: 'Norte' }] as Zone[];

const load = (
  get: (id: string) => Observable<Package>,
  list: () => Observable<Zone[]>,
  routes: DomainRoute[]
): Promise<ReportData> => firstValueFrom(loadReportData({ get }, { list }, routes));

describe('loadReportData', () => {
  it('pide cada paquete una sola vez aunque se repita entre rutas, y salta las paradas sin paquete', async () => {
    const get = jasmine.createSpy('get').and.callFake((id: string) => of(pkg(id)));
    const data = await load(get, () => of(zones), [route('a', null, 'b'), route('a')]);
    expect(get.calls.count()).toBe(2);
    expect([...data.packages.keys()].sort()).toEqual(['a', 'b']);
    expect(data.zones.get('z1')).toBe('Norte');
  });

  it('un paquete que falla queda en null y no corta el reporte; si fallan las zonas, queda sin nombres', async () => {
    const get = (id: string) => (id === 'bad' ? throwError(() => new Error('x')) : of(pkg(id)));
    const data = await load(get, () => throwError(() => new Error('403')), [route('ok', 'bad')]);
    expect(data.packages.get('ok')?.id).toBe('ok');
    expect(data.packages.get('bad')).toBeNull();
    expect(data.zones.size).toBe(0);
  });

  it('sin visitas no pide ningún paquete', async () => {
    const get = jasmine.createSpy('get');
    const data = await load(get, () => of([]), [route(null)]);
    expect(get).not.toHaveBeenCalled();
    expect(data.packages.size).toBe(0);
  });
});

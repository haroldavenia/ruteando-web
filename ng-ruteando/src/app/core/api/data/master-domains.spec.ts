import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Fixture, firstResult, respondWith, setupApi } from '../../../../testing/api-testing';
import { MasterDomain } from '../models';
import { MasterDomainsApi } from './master-domains.api';
import { MASTER_DOMAIN_DEFAULTS, MasterDomainsService } from './master-domains.service';

import list from '../../../../testing/fixtures/gateway/get__master-domains.json';
import get from '../../../../testing/fixtures/gateway/get__master-domains__code.json';
import values from '../../../../testing/fixtures/gateway/get__master-domains__code__values.json';
import addValue from '../../../../testing/fixtures/gateway/post__master-domains__code__values.json';
import toggle from '../../../../testing/fixtures/gateway/patch__master-domains__code__values__key__toggle.json';

const fx = (f: unknown) => f as unknown as Fixture;

describe('MasterDomainsApi', () => {
  it('cubre el contrato capturado: list, get, values, addValue y toggleValue', async () => {
    const { api, controller } = setupApi(MasterDomainsApi);

    const all = firstResult(api.list());
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/master-domains' }), fx(list));
    expect((await all).length).toBe(13);

    const one = firstResult(api.get('PackageStatus'));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/master-domains/PackageStatus' }), fx(get));
    await one;

    const vals = firstResult(api.values('PackageStatus'));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/master-domains/PackageStatus/values' }), fx(values));
    await vals;

    const add = firstResult(api.addValue('PackageStatus', addValue.request.body as never));
    const addReq = controller.expectOne({ method: 'POST', url: '/gateway/master-domains/PackageStatus/values' });
    expect(addReq.request.body).toEqual(addValue.request.body);
    respondWith(addReq, fx(addValue));
    await add;

    const tog = firstResult(api.toggleValue('PackageStatus', 'returned'));
    respondWith(controller.expectOne({ method: 'PATCH', url: '/gateway/master-domains/PackageStatus/values/returned/toggle' }), fx(toggle));
    await tog;
    controller.verify();
  });
});

describe('MasterDomainsService', () => {
  let service: MasterDomainsService;
  let controller: HttpTestingController;

  beforeEach(() => {
    ({ controller } = setupApi(MasterDomainsApi));
    service = TestBed.inject(MasterDomainsService);
  });
  afterEach(() => controller.verify());

  it('antes de cargar (o sin red) devuelve los valores por defecto', () => {
    expect(service.values('RouteTopology').map((v) => v.key)).toEqual([
      'depot_to_depot',
      'round_trip',
      'open_delivery',
      'open_pickup',
      'flexible',
    ]);
    expect(service.values('OsrmProfile').map((v) => v.key)).toEqual(['driving', 'cycling', 'walking']);
    expect(service.values('PackageStatus').map((v) => v.key)).toEqual(['pending', 'attended', 'unattended', 'cancelled']);
    expect(Object.keys(MASTER_DOMAIN_DEFAULTS)).toEqual(['OsrmProfile', 'RouteTopology', 'PackageStatus']);
  });

  it('un dominio desconocido devuelve una lista vacía', () => {
    expect(service.values('NoExiste')).toEqual([]);
    expect(service.activeValues('NoExiste')).toEqual([]);
  });

  it('activeValues devuelve solo los valores activos, en el mismo orden que values', async () => {
    const value = (key: string, active: boolean) => ({ key, label: key, description: null, sortOrder: null, active });
    const domain = { id: 'd1', code: 'PackageStatus', description: '', system: true, values: [value('pending', true), value('returned', false), value('attended', true), value('demo_x', false)] };
    const result = firstResult(service.load());
    controller.expectOne({ method: 'GET', url: '/gateway/master-domains' }).flush([domain]);
    await result;

    expect(service.values('PackageStatus').map((v) => v.key)).toEqual(['pending', 'returned', 'attended', 'demo_x']);
    expect(service.activeValues('PackageStatus').map((v) => v.key)).toEqual(['pending', 'attended']);
  });

  it('antes de cargar, activeValues devuelve los valores por defecto, todos activos', () => {
    expect(service.activeValues('PackageStatus').map((v) => v.key)).toEqual(['pending', 'attended', 'unattended', 'cancelled']);
    expect(service.activeValues('OsrmProfile').length).toBe(3);
  });

  it('load pide los dominios y sustituye los valores por los del gateway', async () => {
    const result = firstResult(service.load());
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/master-domains' }), fx(list));
    await result;

    expect(service.values('PackageStatus').some((v) => v.key.startsWith('demo_'))).toBeTrue();
    expect(service.values('PlaceType').map((v) => v.key)).toContain('warehouse'); // no estaba en los valores por defecto
  });

  it('la segunda carga usa la caché: no hay otra petición', async () => {
    const first = firstResult(service.load());
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/master-domains' }), fx(list));
    await first;

    const second = await firstResult(service.load());
    controller.expectNone('/gateway/master-domains');
    expect(second.length).toBe((list.response.body as MasterDomain[]).length);
  });

  it('dos cargas simultáneas comparten una sola petición', async () => {
    const a = firstResult(service.load());
    const b = firstResult(service.load());

    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/master-domains' }), fx(list));
    await Promise.all([a, b]);
  });

  it('si la carga falla se conservan los valores por defecto y el siguiente intento vuelve a pedirlos', async () => {
    const failed = firstResult(service.load()).catch((e: unknown) => e);
    controller.expectOne('/gateway/master-domains').flush(null, { status: 503, statusText: 'x' });
    await failed;

    expect(service.values('RouteTopology').length).toBe(5);

    const retry = firstResult(service.load());
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/master-domains' }), fx(list));
    await retry;
    expect(service.values('PlaceType').length).toBeGreaterThan(0);
  });
});

import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Fixture, expectSameContract, firstResult, respondWith, setupApi } from '../../../../testing/api-testing';
import { makeUser } from '../../../../testing/session';
import { ApiError } from '../api-error';
import { CurrentUser } from '../../auth/current-user';
import { AssignedServicesApi } from './assigned-services.api';
import { PackagesApi } from './packages.api';
import { ResourcesApi } from './resources.api';
import { UsersApi } from './users.api';
import { ZonesApi } from './zones.api';

import zonesList from '../../../../testing/fixtures/gateway/get__zones.json';
import zonesGet from '../../../../testing/fixtures/gateway/get__zones__id.json';
import zonesCreate from '../../../../testing/fixtures/gateway/post__zones.json';
import zonesUpdate from '../../../../testing/fixtures/gateway/put__zones__id.json';
import zonesDelete from '../../../../testing/fixtures/gateway/delete__zones__id.json';
import zonesContaining from '../../../../testing/fixtures/gateway/get__zones__containing.json';
import assignedList from '../../../../testing/fixtures/gateway/get__assigned-services.json';
import assignedGet from '../../../../testing/fixtures/gateway/get__assigned-services__id.json';
import assignedCreate from '../../../../testing/fixtures/gateway/post__assigned-services.json';
import assignedUpdate from '../../../../testing/fixtures/gateway/put__assigned-services__id.json';
import assignedRemove from '../../../../testing/fixtures/gateway/delete__assigned-services__id.json';
import assignedRemoveMany from '../../../../testing/fixtures/gateway/delete__assigned-services.json';
import assignedSummary from '../../../../testing/fixtures/gateway/get__assigned-services__summary.json';
import assignDriver from '../../../../testing/fixtures/gateway/put__resources__id__driver__driverId.json';
import unassignDriver from '../../../../testing/fixtures/gateway/delete__resources__id__driver.json';
import packageStatus from '../../../../testing/fixtures/gateway/patch__packages__id__status__status.json';
import drivers from '../../../../testing/fixtures/gateway/get__users__drivers.json';
import resetPassword from '../../../../testing/fixtures/gateway/post__users__id__reset-password.json';

const fx = (f: unknown) => f as unknown as Fixture;

describe('ZonesApi (zonas del tenant)', () => {
  let api: ZonesApi;
  let controller: HttpTestingController;

  function setup(user: boolean): void {
    ({ api, controller } = setupApi(ZonesApi));
    if (user) {
      TestBed.inject(CurrentUser).set(makeUser({ tenantId: 'T1' }));
    }
  }

  afterEach(() => controller.verify());

  it('con usuario, el listado lleva el tenantId y entrega un arreglo sin paginar', async () => {
    setup(true);
    const result = firstResult(api.list());
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/zones?tenantId=T1' }), fx(zonesList));

    expect(await result).toEqual(zonesList.response.body as never);
  });

  it('sin usuario no se envía la petición y falla con el error genérico de sesión no válida', async () => {
    setup(false);
    const result = firstResult(api.list()).catch((e: unknown) => e);

    const error = (await result) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('Tu sesión no es válida o ha caducado');
    controller.expectNone(() => true);
  });

  it('get, create, update y remove llevan el tenantId', async () => {
    setup(true);
    const get = firstResult(api.get('z1'));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/zones/z1?tenantId=T1' }), fx(zonesGet));
    await get;

    const create = firstResult(api.create(zonesCreate.request.body as never));
    const createReq = controller.expectOne({ method: 'POST', url: '/gateway/zones?tenantId=T1' });
    expectSameContract(createReq, fx(zonesCreate));
    respondWith(createReq, fx(zonesCreate));
    await create;

    const update = firstResult(api.update('z1', zonesUpdate.request.body as never));
    const updateReq = controller.expectOne({ method: 'PUT', url: '/gateway/zones/z1?tenantId=T1' });
    expectSameContract(updateReq, fx(zonesUpdate));
    respondWith(updateReq, fx(zonesUpdate));
    await update;

    const remove = firstResult(api.remove('z1'));
    respondWith(controller.expectOne({ method: 'DELETE', url: '/gateway/zones/z1?tenantId=T1' }), fx(zonesDelete));
    await remove;
  });

  it('containing busca por longitud y latitud, sin tenantId', async () => {
    setup(false);
    const result = firstResult(api.containing({ lat: 4.60872, lng: -74.07728 }));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/zones/containing?longitude=-74.07728&latitude=4.60872' }), fx(zonesContaining));

    expect((await result).length).toBe(1);
  });
});

describe('AssignedServicesApi', () => {
  let api: AssignedServicesApi;
  let controller: HttpTestingController;

  beforeEach(() => ({ api, controller } = setupApi(AssignedServicesApi)));
  afterEach(() => controller.verify());

  it('list devuelve un arreglo sin paginar', async () => {
    const result = firstResult(api.list());
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/assigned-services' }), fx(assignedList));

    expect((await result).length).toBe(1);
  });

  it('get, create, update y remove respetan el contrato capturado', async () => {
    const get = firstResult(api.get('s1'));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/assigned-services/s1' }), fx(assignedGet));
    await get;

    const create = firstResult(api.create(assignedCreate.request.body as never));
    const createReq = controller.expectOne({ method: 'POST', url: '/gateway/assigned-services' });
    expectSameContract(createReq, fx(assignedCreate));
    respondWith(createReq, fx(assignedCreate));
    await create;

    const update = firstResult(api.update('s1', assignedUpdate.request.body as never));
    const updateReq = controller.expectOne({ method: 'PUT', url: '/gateway/assigned-services/s1' });
    expectSameContract(updateReq, fx(assignedUpdate));
    respondWith(updateReq, fx(assignedUpdate)); // el gateway responde 202
    await update;
    expect(assignedUpdate.response.status).toBe(202);

    const remove = firstResult(api.remove('s1'));
    respondWith(controller.expectOne({ method: 'DELETE', url: '/gateway/assigned-services/s1' }), fx(assignedRemove));
    await remove;
  });

  it('removeMany borra varios con ?ids=a,b', async () => {
    const result = firstResult(api.removeMany(['a', 'b']));
    const req = controller.expectOne((r) => r.method === 'DELETE' && r.url === '/gateway/assigned-services' && r.params.get('ids') === 'a,b');
    expect(req.request.method).toBe(assignedRemoveMany.request.method);
    respondWith(req, fx(assignedRemoveMany));
    await result;
  });

  it('summary acepta el 202 con []', async () => {
    const result = firstResult(api.summary());
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/assigned-services/summary' }), fx(assignedSummary));

    expect(await result).toEqual([]);
    expect(assignedSummary.response.status).toBe(202);
  });
});

describe('operaciones específicas de recursos, paquetes y usuarios', () => {
  it('ResourcesApi asigna y quita el conductor de un recurso', async () => {
    const { api, controller } = setupApi(ResourcesApi);

    const assign = firstResult(api.assignDriver('r1', 'd1'));
    const assignReq = controller.expectOne({ method: 'PUT', url: '/gateway/resources/r1/driver/d1' });
    expect(assignReq.request.body).toBeNull();
    respondWith(assignReq, fx(assignDriver));
    expect((await assign).driverId).toBeTruthy();

    const unassign = firstResult(api.unassignDriver('r1'));
    respondWith(controller.expectOne({ method: 'DELETE', url: '/gateway/resources/r1/driver' }), fx(unassignDriver));
    expect((await unassign).driverId).toBeNull();
    controller.verify();
  });

  it('PackagesApi cambia el estado con PATCH /packages/{id}/status/{status}', async () => {
    const { api, controller } = setupApi(PackagesApi);
    const result = firstResult(api.setStatus('p1', 'attended'));

    respondWith(controller.expectOne({ method: 'PATCH', url: '/gateway/packages/p1/status/attended' }), fx(packageStatus));
    expect((await result).status).toBeTruthy();
    controller.verify();
  });

  it('PackagesApi no ofrece la subida de CSV (contrato sin documentar)', () => {
    const { api } = setupApi(PackagesApi);

    expect((api as unknown as Record<string, unknown>)['upload']).toBeUndefined();
  });

  it('UsersApi lista los conductores y envía el restablecimiento de contraseña', async () => {
    const { api, controller } = setupApi(UsersApi);

    const list = firstResult(api.drivers());
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/users/drivers' }), fx(drivers));
    expect((await list)[0].role).toBe('driver');

    const reset = firstResult(api.sendPasswordReset('u1'));
    respondWith(controller.expectOne({ method: 'POST', url: '/gateway/users/u1/reset-password' }), fx(resetPassword));
    expect((await reset).message).toBeTruthy();
    controller.verify();
  });
});

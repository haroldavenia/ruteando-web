import { Fixture, firstResult, respondWith, setupApi } from '../../../../testing/api-testing';
import { AuditLogsApi } from './audit-logs.api';

import list from '../../../../testing/fixtures/gateway/get__audit-logs.json';
import mine from '../../../../testing/fixtures/gateway/get__audit-logs__me.json';
import admin from '../../../../testing/fixtures/gateway/get__audit-logs__admin.json';
import one from '../../../../testing/fixtures/gateway/get__audit-logs__id.json';

describe('AuditLogsApi', () => {
  const setup = () => setupApi(AuditLogsApi);

  it('list pide los eventos de la empresa y entrega la página como Page (number pasa a page)', async () => {
    const { api, controller } = setup();
    const result = firstResult(api.list());

    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/audit-logs?page=0&size=20' }), list as unknown as Fixture);

    const page = await result;
    expect(page.content.length).toBe(20);
    expect(page.totalElements).toBe(26);
    expect(page.totalPages).toBe(2);
    expect(page.page).toBe(0);
    expect('number' in page).toBeFalse();
    controller.verify();
  });

  it('list envía page y size tal cual (índice desde 0)', () => {
    const { api, controller } = setup();
    api.list({ page: 1, size: 100 }).subscribe();

    controller.expectOne({ method: 'GET', url: '/gateway/audit-logs?page=1&size=100' }).flush((list as unknown as Fixture).response.body as object);
    controller.verify();
  });

  it('listMine pide /me y sus eventos no traen dirección IP', async () => {
    const { api, controller } = setup();
    const result = firstResult(api.listMine({ page: 0, size: 100 }));

    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/audit-logs/me?page=0&size=100' }), mine as unknown as Fixture);

    const page = await result;
    expect(page.content.length).toBeGreaterThan(0);
    expect(page.content.every((log) => log.ipAddress === undefined)).toBeTrue();
    controller.verify();
  });

  it('listAll pide /admin sin tenantId si no se indica', () => {
    const { api, controller } = setup();
    api.listAll({ page: 0, size: 100 }).subscribe();

    controller.expectOne({ method: 'GET', url: '/gateway/audit-logs/admin?page=0&size=100' }).flush((admin as unknown as Fixture).response.body as object);
    controller.verify();
  });

  it('listAll envía tenantId cuando se indica y entrega los eventos con su IP', async () => {
    const { api, controller } = setup();
    const result = firstResult(api.listAll({ page: 0, size: 100 }, 'abc123'));

    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/audit-logs/admin?page=0&size=100&tenantId=abc123' }), admin as unknown as Fixture);

    const page = await result;
    expect(page.content.some((log) => typeof log.ipAddress === 'string')).toBeTrue();
    controller.verify();
  });

  it('get lee un evento por id y lo codifica en la URL', async () => {
    const { api, controller } = setup();
    const result = firstResult(api.get('6acb99b6a2fa810fb39fb5c5'));

    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/audit-logs/6acb99b6a2fa810fb39fb5c5' }), one as unknown as Fixture);

    expect((await result).action).toBe('journey.delete');
    controller.verify();
  });

  it('get no deja que un id con barras cambie la ruta', () => {
    const { api, controller } = setup();
    api.get('../me').subscribe({ error: () => undefined });

    controller.expectOne({ method: 'GET', url: '/gateway/audit-logs/..%2Fme' }).flush(null, { status: 403, statusText: 'Forbidden' });
    controller.verify();
  });
});

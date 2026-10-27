import { Type } from '@angular/core';
import { HttpTestingController } from '@angular/common/http/testing';

import { CrudApi } from '../app/core/api/crud-api';
import { Fixture, asPage, expectSameContract, firstResult, respondWith, setupApi } from './api-testing';

interface CrudSpecOptions<TInput> {
  name: string;
  api: Type<CrudApi<{ id: string }, TInput>>;
  resource: string;
  fixtures: { list: Fixture; get: Fixture; create: Fixture; update: Fixture; remove: Fixture };
}

/** Pruebas de contrato comunes a los servicios con listado paginado y CRUD. */
export function describeCrudApi<TInput>({ name, api, resource, fixtures }: CrudSpecOptions<TInput>): void {
  describe(`${name}: listado y CRUD`, () => {
    let service: CrudApi<{ id: string }, TInput>;
    let controller: HttpTestingController;

    beforeEach(() => {
      ({ api: service, controller } = setupApi(api));
    });
    afterEach(() => controller.verify());

    it('list pide la primera página y entrega la página tipada', async () => {
      const result = firstResult(service.list());
      const req = controller.expectOne({ method: 'GET', url: `/gateway/${resource}?page=0&size=20` });
      respondWith(req, fixtures.list);

      const page = await result;
      expect(page).toEqual(asPage(fixtures.list));
      expect(page.content.length).toBeGreaterThan(0);
    });

    it('list con page y size los envía tal cual (índice desde 0)', () => {
      service.list({ page: 1, size: 5 }).subscribe();

      controller.expectOne({ method: 'GET', url: `/gateway/${resource}?page=1&size=5` }).flush(asPage(fixtures.list));
    });

    it('get lee un recurso por id', async () => {
      const result = firstResult(service.get('abc'));
      const req = controller.expectOne({ method: 'GET', url: `/gateway/${resource}/abc` });
      expect(req.request.method).toBe(fixtures.get.request.method);
      respondWith(req, fixtures.get);

      expect(await result).toEqual(fixtures.get.response.body as { id: string });
    });

    it('create envía el cuerpo del ejemplo por POST', async () => {
      const result = firstResult(service.create(fixtures.create.request.body as TInput));
      const req = controller.expectOne({ method: 'POST', url: `/gateway/${resource}` });
      expectSameContract(req, fixtures.create);
      respondWith(req, fixtures.create);

      expect(await result).toEqual(fixtures.create.response.body as { id: string });
    });

    it('update envía el cuerpo del ejemplo por PUT', async () => {
      const result = firstResult(service.update('abc', fixtures.update.request.body as Partial<TInput>));
      const req = controller.expectOne({ method: 'PUT', url: `/gateway/${resource}/abc` });
      expectSameContract(req, fixtures.update);
      respondWith(req, fixtures.update);

      expect(await result).toEqual(fixtures.update.response.body as { id: string });
    });

    it('remove borra por id y acepta la respuesta sin cuerpo', async () => {
      const result = firstResult(service.remove('abc'));
      const req = controller.expectOne({ method: 'DELETE', url: `/gateway/${resource}/abc` });
      expect(req.request.method).toBe(fixtures.remove.request.method);
      respondWith(req, fixtures.remove);

      expect(fixtures.remove.response.status).toBeLessThan(300);
      expect(await result).toBeNull();
    });

    it('codifica el id en la URL', () => {
      service.get('a/b c').subscribe();

      controller.expectOne({ method: 'GET', url: `/gateway/${resource}/a%2Fb%20c` }).flush({});
    });
  });
}

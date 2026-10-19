import { HttpClient, HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { makeUser } from '../../../testing/session';
import { ApiError } from '../api/api-error';
import { CurrentUser } from './current-user';
import { TenantContext } from './tenant-context';

describe('TenantContext', () => {
  let tenant: TenantContext;
  let currentUser: CurrentUser;
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    tenant = TestBed.inject(TenantContext);
    currentUser = TestBed.inject(CurrentUser);
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  const list$ = () =>
    tenant.withTenant((tenantId) => http.get('/gateway/zones', { params: new HttpParams().set('tenantId', tenantId) }));

  it('con usuario añade su tenantId a la petición', () => {
    currentUser.set(makeUser({ tenantId: 'T1' }));
    list$().subscribe();

    controller.expectOne('/gateway/zones?tenantId=T1').flush([]);
  });

  it('sin usuario no envía la petición y falla con el error genérico de sesión no válida', async () => {
    const result = new Promise<unknown>((resolve) => list$().subscribe({ error: resolve }));

    const error = (await result) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('Tu sesión no es válida o ha caducado');
    controller.expectNone(() => true);
  });

  it('lee el tenantId en el momento de suscribirse, no al construir el observable', () => {
    const request$ = list$();
    currentUser.set(makeUser({ tenantId: 'T2' }));
    request$.subscribe();

    controller.expectOne('/gateway/zones?tenantId=T2').flush([]);
  });
});

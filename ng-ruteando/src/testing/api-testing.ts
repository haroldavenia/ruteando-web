import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Provider, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom } from 'rxjs';

import { API_BASE_URL, Page } from '../app/core/api/api-config';

/** Forma de un fixture generado por `scripts/extract-gateway-fixtures.mjs`. */
export interface Fixture {
  name: string;
  request: { method: string; url: string; body: unknown };
  response: { status: number; body: unknown };
}

export function setupApi<T>(api: Type<T>, extraProviders: Provider[] = []): { api: T; controller: HttpTestingController } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: API_BASE_URL, useValue: '/gateway' }, provideHttpClient(), provideHttpClientTesting(), ...extraProviders],
  });
  return { api: TestBed.inject(api), controller: TestBed.inject(HttpTestingController) };
}

/** Responde a la petición con el estado y el cuerpo reales capturados del gateway. */
export function respondWith(req: TestRequest, fixture: Fixture): void {
  req.flush(fixture.response.body as object | null, { status: fixture.response.status, statusText: 'Capture' });
}

/** Primer valor de un observable (o su error) como promesa. */
export function firstResult<T>(source: Observable<T>): Promise<T> {
  return firstValueFrom(source);
}

export function asPage<T>(fixture: Fixture): Page<T> {
  return fixture.response.body as Page<T>;
}

/** Comprueba que el cuerpo enviado es el del ejemplo y que el método coincide con el capturado. */
export function expectSameContract(req: TestRequest, fixture: Fixture): void {
  expect(req.request.method).withContext(`método de ${fixture.name}`).toBe(fixture.request.method);
  if (fixture.request.body !== null) {
    expect(req.request.body).withContext(`cuerpo de ${fixture.name}`).toEqual(fixture.request.body);
  }
}

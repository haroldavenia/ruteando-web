import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { ApiError } from '../../core/api/api-error';

import { RecordLoader } from './record-loader';

describe('RecordLoader', () => {
  function make(id: string | null, fetch: (id: string) => Observable<{ name: string }>) {
    return runInInjectionContext(TestBed.inject(Injector), () => new RecordLoader(id, fetch));
  }

  it('sin id es un alta y no pide nada', () => {
    const fetch = jasmine.createSpy().and.returnValue(of({ name: 'x' }));
    const loader = make(null, fetch);
    loader.load(() => fail('no debe cargar'));
    expect(loader.status()).toBe('new');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('con id carga el registro y lo entrega', () => {
    const loaded = jasmine.createSpy();
    const loader = make('abc', () => of({ name: 'Furgón' }));
    loader.load(loaded);
    expect(loader.status()).toBe('ready');
    expect(loaded).toHaveBeenCalledOnceWith({ name: 'Furgón' });
  });

  it('un 404 deja el estado "missing" con el mensaje de que ya no existe', () => {
    const loader = make('abc', () => throwError(() => new ApiError({ status: 404, message: 'No se encontró' })));
    loader.load(() => undefined);
    expect(loader.status()).toBe('missing');
    expect(loader.error()).toBe('El registro ya no existe');
  });

  it('otro fallo deja el estado "error" con su mensaje', () => {
    const loader = make('abc', () => throwError(() => new ApiError({ status: 500, message: 'Servicio caído' })));
    loader.load(() => undefined);
    expect(loader.status()).toBe('error');
    expect(loader.error()).toBe('Servicio caído');
  });
});

import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { ApiError } from '../../core/api/api-error';

import { ListState } from './list-state';

function page<T>(content: T[], number = 0, total = content.length): Page<T> {
  return { content, page: number, size: 20, totalElements: total, totalPages: Math.ceil(total / 20) };
}

describe('ListState', () => {
  function make(fetch: (p: PageParams) => Observable<Page<string>>) {
    return runInInjectionContext(TestBed.inject(Injector), () => new ListState<string>(fetch));
  }

  it('empieza cargando y publica la primera página', () => {
    const subject = new Subject<Page<string>>();
    const state = make(() => subject);
    state.load(0);
    expect(state.status()).toBe('loading');

    subject.next(page(['a', 'b'], 0, 45));
    expect(state.status()).toBe('ready');
    expect(state.rows()).toEqual(['a', 'b']);
    expect(state.total()).toBe(45);
  });

  it('cambia de página pidiendo solo esa página y tamaño', () => {
    const fetch = jasmine.createSpy().and.returnValue(of(page(['x'], 2, 41)));
    const state = make(fetch);
    state.goTo(2, 10);

    expect(fetch).toHaveBeenCalledOnceWith({ page: 2, size: 10 });
    expect(state.page()).toBe(2);
    expect(state.size()).toBe(10);
  });

  it('marca la lista vacía cuando no hay registros', () => {
    const state = make(() => of(page<string>([])));
    state.load(0);
    expect(state.status()).toBe('empty');
  });

  it('publica el mensaje del error y permite reintentar la misma página', () => {
    let fail = true;
    const fetch = jasmine.createSpy().and.callFake(() =>
      fail ? throwError(() => new ApiError({ status: 500, message: 'El servicio no está disponible' })) : of(page(['a'], 1, 21)),
    );
    const state = make(fetch);
    state.load(1);
    expect(state.status()).toBe('error');
    expect(state.error()).toBe('El servicio no está disponible');

    fail = false;
    state.reload();
    expect(fetch.calls.mostRecent().args[0]).toEqual({ page: 1, size: 20 });
    expect(state.status()).toBe('ready');
    expect(state.error()).toBeNull();
  });

  it('reload conserva la página', () => {
    const fetch = jasmine.createSpy().and.callFake((p: PageParams) => of(page(['r'], p.page ?? 0, 100)));
    const state = make(fetch);
    state.goTo(3);
    state.reload();
    expect(fetch.calls.mostRecent().args[0]).toEqual({ page: 3, size: 20 });
  });

  it('retrocede si una página que no es la primera queda vacía pero aún hay registros', () => {
    const fetch = jasmine.createSpy().and.callFake((p: PageParams) =>
      p.page === 2 ? of(page([], 2, 40)) : of(page(['z'], p.page ?? 0, 40)),
    );
    const state = make(fetch);
    state.load(2);
    expect(state.page()).toBe(1);
    expect(state.rows()).toEqual(['z']);
  });

  it('una carga nueva cancela la anterior', () => {
    const first = new Subject<Page<string>>();
    const second = new Subject<Page<string>>();
    let n = 0;
    const state = make(() => (n++ === 0 ? first : second));
    state.load(0);
    state.load(1);
    first.next(page(['viejo']));
    expect(state.rows()).toEqual([]);
    second.next(page(['nuevo'], 1, 21));
    expect(state.rows()).toEqual(['nuevo']);
  });

  describe('countText', () => {
    it('dice el total que informa el gateway, en singular o en plural', () => {
      const state = make(() => of(page(['a', 'b'], 0, 137)));
      state.load(0);
      expect(state.countText('paquete', 'paquetes')).toBe('137 paquetes');

      const one = make(() => of(page(['a'], 0, 1)));
      one.load(0);
      expect(one.countText('paquete', 'paquetes')).toBe('1 paquete');
    });

    it('no dice nada mientras carga, si no hay registros ni si falló', () => {
      const loading = make(() => new Subject<Page<string>>());
      loading.load(0);
      expect(loading.countText('lugar', 'lugares')).toBeNull();

      const empty = make(() => of(page<string>([], 0, 0)));
      empty.load(0);
      expect(empty.countText('lugar', 'lugares')).toBeNull();

      const failed = make(() => throwError(() => new ApiError({ status: 500, message: 'x' })));
      failed.load(0);
      expect(failed.countText('lugar', 'lugares')).toBeNull();
    });
  });
});

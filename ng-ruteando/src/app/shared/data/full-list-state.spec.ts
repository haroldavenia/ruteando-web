import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { ApiError } from '../../core/api/api-error';

import { FULL_LIST_LIMIT, FULL_LIST_PAGE_SIZE, FullListState } from './full-list-state';

/** Un servidor con `total` registros numerados que responde por páginas, como el gateway. */
function server(total: number): jasmine.Spy<(p: PageParams) => Observable<Page<number>>> {
  return jasmine.createSpy('fetch').and.callFake(({ page = 0, size = 20 }: PageParams) => {
    const all = Array.from({ length: total }, (_, i) => i);
    return of({ content: all.slice(page * size, page * size + size), page, size, totalElements: total, totalPages: Math.ceil(total / size) });
  });
}

describe('FullListState', () => {
  const create = (fetch: (p: PageParams) => Observable<Page<number>>) => TestBed.runInInjectionContext(() => new FullListState<number>(fetch));

  it('está en modo cliente: la tabla filtra y pagina ella misma', () => {
    expect(create(server(1)).clientSide).toBeTrue();
  });

  it('con pocos registros hace una sola petición de 100 y los deja todos en rows', () => {
    const fetch = server(14);
    const state = create(fetch);
    state.load();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.calls.argsFor(0)[0]).toEqual({ page: 0, size: FULL_LIST_PAGE_SIZE });
    expect(state.rows().length).toBe(14);
    expect(state.total()).toBe(14);
    expect(state.status()).toBe('ready');
    expect(state.truncated()).toBeFalse();
  });

  it('pide las páginas de 100 en 100 hasta traer todo', () => {
    const fetch = server(250);
    const state = create(fetch);
    state.load();

    expect(fetch.calls.allArgs().map(([p]) => p.page)).toEqual([0, 1, 2]);
    expect(state.rows().length).toBe(250);
    expect(state.rows()[249]).toBe(249);
    expect(state.truncated()).toBeFalse();
  });

  it('se detiene en el tope y avisa de que hay más de lo traído', () => {
    const fetch = server(FULL_LIST_LIMIT + 340);
    const state = create(fetch);
    state.load();

    expect(fetch).toHaveBeenCalledTimes(FULL_LIST_LIMIT / FULL_LIST_PAGE_SIZE);
    expect(state.rows().length).toBe(FULL_LIST_LIMIT);
    expect(state.total()).toBe(FULL_LIST_LIMIT + 340);
    expect(state.truncated()).toBeTrue();
  });

  it('sin registros queda vacía', () => {
    const state = create(server(0));
    state.load();

    expect(state.status()).toBe('empty');
    expect(state.rows()).toEqual([]);
  });

  it('mientras llega la respuesta está cargando', () => {
    const state = create(() => new Subject<Page<number>>());
    state.load();

    expect(state.status()).toBe('loading');
  });

  it('si falla una petición muestra el mensaje y recargar vuelve a pedir todo desde la primera página', () => {
    let fail = true;
    const fetch = jasmine.createSpy('fetch').and.callFake((p: PageParams) =>
      fail ? throwError(() => new ApiError({ status: 500, message: 'El servicio no está disponible' })) : server(5)(p),
    );
    const state = create(fetch);
    state.load();

    expect(state.status()).toBe('error');
    expect(state.error()).toBe('El servicio no está disponible');

    fail = false;
    state.reload();

    expect(state.status()).toBe('ready');
    expect(fetch.calls.mostRecent().args[0]).toEqual({ page: 0, size: FULL_LIST_PAGE_SIZE });
    expect(state.rows().length).toBe(5);
  });

  it('una carga nueva cancela la anterior', () => {
    const first = new Subject<Page<number>>();
    const fetch = jasmine.createSpy('fetch').and.returnValues(first, server(2)({ page: 0, size: 100 }));
    const state = create(fetch);
    state.load();
    state.load();
    first.next({ content: [9, 9, 9], page: 0, size: 100, totalElements: 3, totalPages: 1 });
    first.complete();

    expect(state.rows()).toEqual([0, 1]);
  });
});

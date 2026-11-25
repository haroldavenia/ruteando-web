import { TestBed } from '@angular/core/testing';

import { LocalListState } from './local-list-state';

describe('LocalListState', () => {
  const make = () => TestBed.runInInjectionContext(() => new LocalListState<{ id: string }>());

  it('es un listado del cliente: la tabla filtra y pagina sobre todas las filas', () => {
    expect(make().clientSide).toBeTrue();
  });

  it('con filas queda listo y cuenta el total', () => {
    const state = make();
    state.set([{ id: 'a' }, { id: 'b' }]);
    expect(state.status()).toBe('ready');
    expect(state.total()).toBe(2);
    expect(state.rows().length).toBe(2);
  });

  it('sin filas queda vacío y se puede volver a llenar', () => {
    const state = make();
    state.set([]);
    expect(state.status()).toBe('empty');
    state.set([{ id: 'a' }]);
    expect(state.status()).toBe('ready');
  });

  it('cargar de nuevo no pide nada ni cambia las filas', () => {
    const state = make();
    state.set([{ id: 'a' }]);
    state.load();
    expect(state.rows().length).toBe(1);
  });
});

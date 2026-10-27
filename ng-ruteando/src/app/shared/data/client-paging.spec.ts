import { firstValueFrom, of, throwError } from 'rxjs';

import { ClientPaging } from './client-paging';

describe('ClientPaging', () => {
  const items = Array.from({ length: 45 }, (_, i) => i);

  it('devuelve la página pedida con el total', async () => {
    const paging = new ClientPaging(() => of(items));
    const page = await firstValueFrom(paging.fetch({ page: 2, size: 20 }));
    expect(page.content).toEqual([40, 41, 42, 43, 44]);
    expect(page.totalElements).toBe(45);
    expect(page.totalPages).toBe(3);
    expect(page.page).toBe(2);
  });

  it('al cambiar de página no vuelve a pedir la lista', async () => {
    const source = jasmine.createSpy().and.returnValue(of(items));
    const paging = new ClientPaging(source);
    await firstValueFrom(paging.fetch({ page: 0, size: 20 }));
    await firstValueFrom(paging.fetch({ page: 1, size: 20 }));
    expect(source).toHaveBeenCalledTimes(1);
  });

  it('invalidate() fuerza una petición nueva', async () => {
    const source = jasmine.createSpy().and.returnValue(of(items));
    const paging = new ClientPaging(source);
    await firstValueFrom(paging.fetch({}));
    paging.invalidate();
    await firstValueFrom(paging.fetch({}));
    expect(source).toHaveBeenCalledTimes(2);
  });

  it('si la primera carga falla no guarda nada y el reintento vuelve a pedirla', async () => {
    let fail = true;
    const paging = new ClientPaging(() => (fail ? throwError(() => new Error('x')) : of(items)));
    await expectAsync(firstValueFrom(paging.fetch({}))).toBeRejected();
    fail = false;
    expect((await firstValueFrom(paging.fetch({}))).totalElements).toBe(45);
  });

  it('sin parámetros usa la primera página de 20', async () => {
    const page = await firstValueFrom(new ClientPaging(() => of(items)).fetch({}));
    expect(page.content.length).toBe(20);
  });
});

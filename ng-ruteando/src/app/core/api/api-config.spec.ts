import { Page, pageParams } from './api-config';

describe('paginación de la API', () => {
  it('la segunda página de 20 elementos pide page=1 y size=20', () => {
    expect(pageParams({ page: 1, size: 20 }).toString()).toBe('page=1&size=20');
  });

  it('por defecto pide la primera página (índice 0) de 20 elementos', () => {
    expect(pageParams().toString()).toBe('page=0&size=20');
  });

  it('la estructura de página del gateway se tipa con content y totales', () => {
    const body: Page<{ id: string }> = {
      content: [{ id: 'a' }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    };
    expect(body.content[0].id).toBe('a');
    expect(body.totalPages).toBe(1);
  });
});

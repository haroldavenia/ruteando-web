import { Observable, of } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { Journey } from '../../core/api/models';

import { fetchLatestJourneys, latestJourneys } from './latest-journeys';

const journey = (name: string, createdAt: string | null): Journey => ({ id: name, name, createdAt } as unknown as Journey);
const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}T10:00:00Z`;
const names = (items: Journey[]) => items.map((j) => j.name);

describe('latestJourneys', () => {
  it('ordena de la más reciente a la más antigua y se queda con las pedidas', () => {
    const items = [1, 5, 3, 7, 2, 6, 4].map((n) => journey(`J${n}`, day(n)));
    expect(names(latestJourneys(items))).toEqual(['J7', 'J6', 'J5', 'J4', 'J3']);
  });

  it('con pocas jornadas las devuelve todas ordenadas', () => {
    expect(names(latestJourneys([journey('A', day(1)), journey('B', day(3)), journey('C', day(2))]))).toEqual(['B', 'C', 'A']);
  });

  it('con fechas iguales conserva el orden de entrada', () => {
    expect(names(latestJourneys([journey('A', day(2)), journey('B', day(2)), journey('C', day(2))]))).toEqual(['A', 'B', 'C']);
  });

  it('las jornadas sin fecha o con fecha inválida quedan al final, en su orden', () => {
    const items = [journey('Sin1', null), journey('Vieja', day(1)), journey('Mala', 'no-es-fecha'), journey('Nueva', day(9))];
    expect(names(latestJourneys(items))).toEqual(['Nueva', 'Vieja', 'Sin1', 'Mala']);
  });

  it('no modifica la lista original', () => {
    const items = [journey('A', day(1)), journey('B', day(2))];
    latestJourneys(items);
    expect(names(items)).toEqual(['A', 'B']);
  });
});

describe('fetchLatestJourneys', () => {
  /** Gateway falso con `total` jornadas (J1 la más antigua) en el orden pedido; anota las páginas pedidas. */
  function fake(total: number, order: 'asc' | 'desc') {
    const all = Array.from({ length: total }, (_, i) => journey(`J${i + 1}`, day(i + 1)));
    const sorted = order === 'asc' ? all : [...all].reverse();
    const calls: PageParams[] = [];
    const list = (params: PageParams): Observable<Page<Journey>> => {
      calls.push(params);
      const size = params.size ?? 20;
      const page = params.page ?? 0;
      return of({ content: sorted.slice(page * size, page * size + size), page, size, totalElements: total, totalPages: Math.max(1, Math.ceil(total / size)) });
    };
    return { list, calls };
  }
  const run = (list: (p: PageParams) => Observable<Page<Journey>>) => {
    let result: Journey[] = [];
    fetchLatestJourneys(list).subscribe((items) => (result = items));
    return names(result);
  };

  it('con el orden por defecto de más nueva a más antigua basta una petición', () => {
    const { list, calls } = fake(12, 'desc');
    expect(run(list)).toEqual(['J12', 'J11', 'J10', 'J9', 'J8']);
    expect(calls).toEqual([{ page: 0, size: 5 }]);
  });

  it('si viene ascendente pide la última página y devuelve las más nuevas', () => {
    const { list, calls } = fake(15, 'asc');
    expect(run(list)).toEqual(['J15', 'J14', 'J13', 'J12', 'J11']);
    expect(calls).toEqual([{ page: 0, size: 5 }, { page: 2, size: 5 }]);
  });

  it('si la última página queda corta pide también la anterior', () => {
    const { list, calls } = fake(12, 'asc');
    expect(run(list)).toEqual(['J12', 'J11', 'J10', 'J9', 'J8']);
    expect(calls).toEqual([{ page: 0, size: 5 }, { page: 2, size: 5 }, { page: 1, size: 5 }]);
  });

  for (const order of ['asc', 'desc'] as const) {
    it(`con pocas jornadas (${order}) basta una petición y salen ordenadas`, () => {
      const { list, calls } = fake(3, order);
      expect(run(list)).toEqual(['J3', 'J2', 'J1']);
      expect(calls.length).toBe(1);
    });
  }

  it('sin jornadas devuelve una lista vacía', () => {
    const { list } = fake(0, 'desc');
    expect(run(list)).toEqual([]);
  });

  it('si la primera página no permite saber el orden (fechas iguales) usa esa página', () => {
    const same = (n: number) => journey(`J${n}`, day(1));
    const list = (): Observable<Page<Journey>> => of({ content: [1, 2, 3, 4, 5].map(same), page: 0, size: 5, totalElements: 9, totalPages: 2 });
    expect(run(list)).toEqual(['J1', 'J2', 'J3', 'J4', 'J5']);
  });

  it('propaga el error del gateway', () => {
    let failed = false;
    fetchLatestJourneys(() => new Observable<Page<Journey>>((s) => s.error(new Error('x')))).subscribe({ error: () => (failed = true) });
    expect(failed).toBeTrue();
  });
});

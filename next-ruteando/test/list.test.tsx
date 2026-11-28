import { render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { DataTable } from '@/components/data/data-table';
import { ApiError, getData, requestJson } from '@/lib/api-client';
import { I18nProvider } from '@/lib/i18n/client';
import { dictionaryOf } from '@/lib/i18n/dictionary';
import { fetchAllPages, FULL_LIST_LIMIT, FULL_LIST_PAGE_SIZE, type Page } from '@/lib/list/fetch-all';
import {
  chipsOf,
  type Column,
  filterByFacet,
  normalizeText,
  paginate,
  rangeLabel,
  scopeText,
  searchRows,
} from '@/lib/list/list-logic';
import { type FullList, useFullList } from '@/lib/list/use-full-list';
import { useStoredPref } from '@/lib/stored-pref';

import { renderWithI18n } from './render';

const t = (key: string, args: readonly (string | number)[] = []) =>
  args.reduce<string>((text, a, i) => text.replace(`{${i}}`, String(a)), key);

interface Row {
  id: string;
  name: string;
  state: 'ACTIVO' | 'INACTIVO';
}
const rows: Row[] = [
  { id: '1', name: 'Camión Ñandú', state: 'ACTIVO' },
  { id: '2', name: 'Furgón azul', state: 'INACTIVO' },
  { id: '3', name: 'Moto', state: 'ACTIVO' },
];
const columns: Column<Row>[] = [
  { id: 'name', header: 'Nombre', cell: (r) => r.name, link: (r) => `/v/${r.id}`, primary: true },
  { id: 'state', header: 'Estado', cell: (r) => r.state, tone: (r) => (r.state === 'ACTIVO' ? 'success' : 'neutral') },
  { id: 'note', header: 'Nota', cell: () => '', kind: 'muted' },
];
const facet = {
  label: 'Estado',
  of: (r: Row) => r.state,
  options: [
    { key: 'ACTIVO', label: 'Activo' },
    { key: 'INACTIVO', label: 'Inactivo' },
    { key: 'BLOQUEADO', label: 'Bloqueado' },
  ],
};

describe('lógica de listas', () => {
  test('normalizeText ignora mayúsculas y acentos; searchRows busca en cualquier columna', () => {
    expect(normalizeText('  ÁrBol Ñu ')).toBe('  arbol nu ');
    expect(searchRows(rows, columns, 'camion').map((r) => r.id)).toEqual(['1']);
    expect(searchRows(rows, columns, 'inactivo').map((r) => r.id)).toEqual(['2']);
    expect(searchRows(rows, columns, '   ')).toBe(rows);
    expect(searchRows(rows, columns, 'zzz')).toEqual([]);
  });

  test('filterByFacet y chipsOf: recuentos, estados vacíos ocultos salvo el elegido', () => {
    expect(filterByFacet(rows, facet, 'ACTIVO').map((r) => r.id)).toEqual(['1', '3']);
    expect(filterByFacet(rows, facet, null)).toBe(rows);
    expect(filterByFacet(rows, null, 'ACTIVO')).toBe(rows);
    expect(chipsOf(rows, facet, null, 'Todos')).toEqual([
      { key: null, label: 'Todos', count: 3, on: true },
      { key: 'ACTIVO', label: 'Activo', count: 2, on: false },
      { key: 'INACTIVO', label: 'Inactivo', count: 1, on: false },
    ]);
    const chosen = chipsOf(rows, facet, 'BLOQUEADO', 'Todos');
    expect(chosen.at(-1)).toEqual({ key: 'BLOQUEADO', label: 'Bloqueado', count: 0, on: true });
  });

  test('paginate ajusta el índice si lo filtrado se acortó y nunca da uno negativo', () => {
    const list = Array.from({ length: 25 }, (_, i) => i);
    expect(paginate(list, 1, 10)).toEqual({ rows: list.slice(10, 20), index: 1, last: 2 });
    expect(paginate(list, 9, 10).index).toBe(2);
    expect(paginate(list, -3, 10).index).toBe(0);
    expect(paginate([], 4, 10)).toEqual({ rows: [], index: 0, last: 0 });
  });

  test('rangeLabel y scopeText', () => {
    expect(rangeLabel(0, 10, 0, t)).toBe('0 de 0');
    expect(rangeLabel(1, 10, 25, t)).toBe('11 – 20 de 25');
    expect(rangeLabel(2, 10, 25, t)).toBe('21 – 25 de 25');
    const base = { shown: 2, loaded: 10, total: 10, filtering: false, plural: 'vehículos' };
    expect(scopeText(base, t)).toBe('');
    expect(scopeText({ ...base, filtering: true }, t)).toBe('2 de 10');
    expect(scopeText({ ...base, total: 1500, filtering: true }, t)).toBe(
      '2 de 10 · Se muestran los primeros 10 vehículos de 1500'
    );
    expect(scopeText({ ...base, total: 1500 }, t)).toBe('Se muestran los primeros 10 vehículos de 1500');
  });
});

describe('fetchAllPages', () => {
  const makePager = (total: number) =>
    vi.fn(async (page: number, size: number): Promise<Page<number>> => {
      const start = page * size;
      return {
        content: Array.from({ length: Math.max(0, Math.min(size, total - start)) }, (_, i) => start + i),
        totalElements: total,
      };
    });

  test('una sola página si cabe todo', async () => {
    const pager = makePager(7);
    expect(await fetchAllPages(pager)).toEqual({ rows: [0, 1, 2, 3, 4, 5, 6], total: 7 });
    expect(pager).toHaveBeenCalledTimes(1);
    expect(pager).toHaveBeenCalledWith(0, FULL_LIST_PAGE_SIZE);
  });

  test('pide las páginas que faltan y las junta en orden', async () => {
    const pager = makePager(250);
    const { rows: all, total } = await fetchAllPages(pager);
    expect(pager).toHaveBeenCalledTimes(3);
    expect(total).toBe(250);
    expect(all).toHaveLength(250);
    expect(all[249]).toBe(249);
  });

  test('con más de 1000 registros se queda en el tope e informa el total real', async () => {
    const pager = makePager(5000);
    const { rows: all, total } = await fetchAllPages(pager);
    expect(all).toHaveLength(FULL_LIST_LIMIT);
    expect(total).toBe(5000);
    expect(pager).toHaveBeenCalledTimes(FULL_LIST_LIMIT / FULL_LIST_PAGE_SIZE);
  });

  test('un fallo en cualquier página falla toda la carga (no se muestra una lista a medias)', async () => {
    const pager = vi.fn(async (page: number): Promise<Page<number>> => {
      if (page === 1) throw new Error('caída');
      return { content: [1], totalElements: 250 };
    });
    await expect(fetchAllPages(pager)).rejects.toThrow('caída');
  });
});

describe('useFullList', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider lang="es" dictionary={dictionaryOf('es')}>
      {children}
    </I18nProvider>
  );

  test('carga, queda lista, y reload vuelve a pedir', async () => {
    const fetchPage = vi.fn(async (): Promise<Page<Row>> => ({ content: rows, totalElements: 3 }));
    const { result } = renderHook(() => useFullList(fetchPage), { wrapper });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.rows).toHaveLength(3);
    result.current.reload();
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  test('sin registros es «vacío»; un fallo es «error» con el mensaje', async () => {
    const empty = renderHook(() => useFullList(async () => ({ content: [], totalElements: 0 })), { wrapper });
    await waitFor(() => expect(empty.result.current.status).toBe('empty'));
    const failing = renderHook(
      () =>
        useFullList(async () => {
          throw new ApiError(503, 'El servicio no está disponible');
        }),
      { wrapper }
    );
    await waitFor(() => expect(failing.result.current.status).toBe('error'));
    expect(failing.result.current.error).toBe('El servicio no está disponible');
  });

  test('una respuesta vieja no pisa a una más reciente', async () => {
    let release!: (page: Page<number>) => void;
    const slow = () => new Promise<Page<number>>((resolve) => (release = resolve));
    const fast = async () => ({ content: [2], totalElements: 1 });
    const { result, rerender } = renderHook(({ fn }) => useFullList<number>(fn), {
      wrapper,
      initialProps: { fn: slow as () => Promise<Page<number>> },
    });
    const stale = release;
    rerender({ fn: fast });
    await waitFor(() => expect(result.current.rows).toEqual([2]));
    stale({ content: [1], totalElements: 1 });
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.rows).toEqual([2]);
  });
});

describe('DataTable', () => {
  const ready = (over: Partial<FullList<Row>> = {}): FullList<Row> => ({
    status: 'ready',
    rows,
    total: rows.length,
    error: null,
    reload: vi.fn(),
    ...over,
  });
  const many = (n: number): Row[] =>
    Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Vehículo ${i}`, state: 'ACTIVO' as const }));

  beforeEach(() => window.localStorage.clear());

  const table = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) => (
    <DataTable<Row>
      list={ready()}
      columns={columns}
      entityPlural="vehículos"
      emptyMessage="Todavía no hay vehículos"
      {...props}
    />
  );

  test('pinta las filas con enlace, etiqueta de estado y oculta el dato vacío al apilar', () => {
    renderWithI18n(table());
    expect(screen.getByRole('link', { name: 'Camión Ñandú' })).toHaveAttribute('href', '/v/1');
    expect(screen.getAllByText('ACTIVO')).toHaveLength(2);
    const cell = screen.getAllByRole('row')[1]!.querySelectorAll('td')[2]!;
    expect(cell.className).toContain('@max-[840px]:hidden'); // celda vacía
    expect(cell).toHaveAttribute('data-label', 'Nota');
  });

  test('busca sin distinguir acentos, cuenta y se puede limpiar', async () => {
    const user = userEvent.setup();
    renderWithI18n(table());
    await user.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'camion');
    expect(screen.getAllByRole('row')).toHaveLength(2); // cabecera + 1
    expect(screen.getByText('1 de 3')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No hay resultados')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  test('«/» enfoca la búsqueda, salvo que ya se escriba en un campo', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <>
        <input aria-label="otro" />
        {table()}
      </>
    );
    await user.keyboard('/');
    expect(screen.getByRole('searchbox')).toHaveFocus();
    await user.type(screen.getByLabelText('otro'), '/');
    expect(screen.getByLabelText('otro')).toHaveValue('/');
    expect(screen.getByLabelText('otro')).toHaveFocus();
  });

  test('chips de estado con recuento filtran y se combinan con la búsqueda', async () => {
    const user = userEvent.setup();
    renderWithI18n(table({ facet }));
    const group = screen.getByRole('group', { name: 'Estado' });
    expect(within(group).getByRole('button', { name: /Todos\s*3/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).queryByRole('button', { name: /Bloqueado/ })).toBeNull(); // sin filas, oculto
    await user.click(within(group).getByRole('button', { name: /Activo\s*2/ }));
    expect(screen.getAllByRole('row')).toHaveLength(3);
    await user.type(screen.getByRole('searchbox'), 'moto');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    // los recuentos son sobre la búsqueda, no sobre todo
    expect(within(group).getByRole('button', { name: /Todos\s*1/ })).toBeInTheDocument();
  });

  test('pagina, cambia las filas por página y vuelve a la primera al filtrar', async () => {
    const user = userEvent.setup();
    renderWithI18n(table({ list: ready({ rows: many(45), total: 45 }) }));
    // Como en Angular: 20 filas por página y solo anterior y siguiente
    expect(screen.getByText('1 – 20 de 45')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Primera página' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getByText('21 – 40 de 45')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getByText('41 – 45 de 45')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Página anterior' }));
    await user.click(screen.getByRole('button', { name: 'Página anterior' }));
    await user.selectOptions(screen.getByLabelText('Filas por página'), '10');
    expect(screen.getByText('1 – 10 de 45')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await user.type(screen.getByRole('searchbox'), 'Vehículo 1');
    expect(screen.getByText(/^1 – \d+ de \d+$/)).toBeInTheDocument(); // volvió a la página 1
  });

  test('avisa cuando hay más registros de los traídos', () => {
    renderWithI18n(table({ list: ready({ total: 1500 }) }));
    expect(screen.getByText('Se muestran los primeros 3 vehículos de 1500')).toBeInTheDocument();
  });

  test('selección: una fila, las visibles, barra de acciones y quitar', async () => {
    const user = userEvent.setup();
    const onBulk = vi.fn();
    renderWithI18n(
      table({
        selectable: true,
        selectionActions: (picked, clear) => (
          <button
            onClick={() => {
              onBulk(picked.map((r) => r.id));
              clear();
            }}
          >
            borrar
          </button>
        ),
      })
    );
    expect(screen.queryByRole('region', { name: 'Acciones sobre la selección' })).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Moto' }));
    const bar = screen.getByRole('region', { name: 'Acciones sobre la selección' });
    expect(bar).toHaveTextContent('1 seleccionado');
    const all = screen.getByRole('checkbox', { name: 'Seleccionar las filas que se ven' });
    expect((all as HTMLInputElement).indeterminate).toBe(true);
    await user.click(all);
    expect(bar).toHaveTextContent('3 seleccionados');
    await user.click(all); // todas marcadas: las desmarca
    expect(screen.queryByRole('region', { name: 'Acciones sobre la selección' })).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Moto' }));
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Furgón azul' }));
    await user.click(screen.getByRole('button', { name: 'borrar' }));
    expect(onBulk).toHaveBeenCalledWith(['2', '3']);
    expect(screen.queryByRole('region', { name: 'Acciones sobre la selección' })).toBeNull(); // clear
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Moto' }));
    await user.click(screen.getByRole('button', { name: 'Quitar la selección' }));
    expect(screen.queryByRole('region', { name: 'Acciones sobre la selección' })).toBeNull();
  });

  test('estados: cargando (esqueleto anunciado), vacío con acción, error con reintentar', async () => {
    const user = userEvent.setup();
    const view = renderWithI18n(table({ list: ready({ status: 'loading', rows: [] }) }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando vehículos…');
    view.unmount();

    const empty = renderWithI18n(
      table({ list: ready({ status: 'empty', rows: [], total: 0 }), emptyAction: <a href="/nuevo">Crear</a> })
    );
    expect(screen.getByText('Todavía no hay vehículos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear' })).toBeInTheDocument();
    empty.unmount();

    const reload = vi.fn();
    renderWithI18n(table({ list: ready({ status: 'error', rows: [], error: 'No hay conexión', reload }) }));
    expect(screen.getByRole('alert')).toHaveTextContent('No hay conexión');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reload).toHaveBeenCalled();
  });

  test('acciones de fila', () => {
    renderWithI18n(table({ rowActions: (r) => <button>editar {r.id}</button> }));
    expect(screen.getByRole('button', { name: 'editar 2' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
  });

  test('vista de tarjetas (la preferida) y tabla; la elección se recuerda y la densidad solo sale en tabla', async () => {
    const user = userEvent.setup();
    const props = { card: ({ row }: { row: Row }) => <article>tarjeta {row.name}</article> };
    const view = renderWithI18n(table(props));
    expect(screen.getByText('tarjeta Moto')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Densidad de las filas' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ver como tabla' }));
    expect(screen.queryByText('tarjeta Moto')).toBeNull();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(window.localStorage.getItem('ruteando-list-view')).toBe('table');
    await user.click(screen.getByRole('button', { name: 'Filas compactas' }));
    expect(window.localStorage.getItem('ruteando-density')).toBe('compact');
    expect(screen.getByRole('button', { name: 'Filas compactas' })).toHaveAttribute('aria-pressed', 'true');
    view.unmount();
    renderWithI18n(table(props)); // «recuerda»: arranca en tabla
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  test('sin plantilla de tarjetas no hay selector de vista; las tarjetas reciben selección', async () => {
    const user = userEvent.setup();
    renderWithI18n(table());
    expect(screen.queryByRole('group', { name: 'Vista de la lista' })).toBeNull();
    window.localStorage.setItem('ruteando-list-view', 'cards');
    renderWithI18n(
      table({
        selectable: true,
        card: ({ row, selected, toggle }) => (
          <button onClick={toggle}>
            {row.name} {selected ? 'elegida' : ''}
          </button>
        ),
      })
    );
    await user.click(screen.getByRole('button', { name: 'Moto' }));
    expect(screen.getByRole('button', { name: 'Moto elegida' })).toBeInTheDocument();
  });

  test('filtro y estado controlados desde fuera, y lo filtrado sale por onFiltered', async () => {
    const user = userEvent.setup();
    const seen: string[][] = [];
    function Controlled() {
      const [filter, setFilter] = useState('mo');
      const [key, setKey] = useState<string | null>(null);
      return (
        <>
          <output data-testid="state">{`${filter}|${key}`}</output>
          {table({
            facet,
            filter,
            onFilterChange: setFilter,
            facetKey: key,
            onFacetChange: setKey,
            onFiltered: (r) => seen.push(r.map((x) => x.id)),
          })}
        </>
      );
    }
    renderWithI18n(<Controlled />);
    expect(screen.getByRole('searchbox')).toHaveValue('mo');
    expect(seen.at(-1)).toEqual(['3']);
    await user.click(screen.getByRole('button', { name: /Activo/ }));
    expect(screen.getByTestId('state')).toHaveTextContent('mo|ACTIVO');
    await user.clear(screen.getByRole('searchbox'));
    expect(screen.getByTestId('state')).toHaveTextContent('|ACTIVO');
    expect(seen.at(-1)).toEqual(['1', '3']);
  });
});

describe('useStoredPref', () => {
  function Probe() {
    const [value, set] = useStoredPref('k', ['a', 'b'] as const, 'a');
    return <button onClick={() => set('b')}>{value}</button>;
  }
  beforeEach(() => window.localStorage.clear());

  test('valor por defecto, guarda y actualiza; ignora lo guardado que no esté permitido', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('k', 'zzz');
    render(<Probe />);
    expect(screen.getByRole('button')).toHaveTextContent('a');
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('b');
    expect(window.localStorage.getItem('k')).toBe('b');
  });

  test('con el almacenamiento bloqueado sigue funcionando con el valor por defecto', async () => {
    const user = userEvent.setup();
    const blocked = () => {
      throw new Error('bloqueado');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    render(<Probe />);
    expect(screen.getByRole('button')).toHaveTextContent('a');
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('a');
    vi.unstubAllGlobals();
  });
});

describe('cliente HTTP genérico', () => {
  test('getData pide /middleware/data/<recurso> sin cuerpo ni content-type; requestJson envía el método', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    expect(await getData('/places?page=0', t)).toEqual({ ok: 1 });
    expect(spy).toHaveBeenLastCalledWith('/middleware/data/places?page=0', {
      method: 'GET',
      headers: {},
      body: undefined,
    });
    await getData('vehicles', t);
    expect(spy.mock.lastCall![0]).toBe('/middleware/data/vehicles');
    await requestJson('PATCH', '/middleware/data/x', { a: 1 }, t);
    expect(spy.mock.lastCall![1]).toMatchObject({
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{"a":1}',
    });
    spy.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await requestJson('DELETE', '/middleware/data/x', undefined, t)).toEqual({});
    spy.mockRestore();
  });

  test('un fallo es un ApiError con el mensaje redactado', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 404 }));
    await expect(getData('x', t)).rejects.toMatchObject({
      status: 404,
      message: 'No se encontró el recurso solicitado',
    });
    spy.mockRejectedValue(new TypeError('red'));
    await expect(getData('x', t)).rejects.toMatchObject({ status: 0 });
    spy.mockRestore();
  });
});

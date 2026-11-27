import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { HomeDashboard } from '@/components/home/home-dashboard';
import type { Journey, Package } from '@/lib/api/models';
import { fetchLatestJourneys, latestJourneys, packageFigures } from '@/lib/home/figures';

import { mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
}));

const pkg = (status: string) => ({ id: status + Math.random(), status }) as unknown as Package;
const journey = (id: string, createdAt: string | null, status = 'planned', over: Partial<Journey> = {}) =>
  ({ id, name: `Jornada ${id}`, status, createdAt, totalServices: 12, totalResources: 3, ...over }) as Journey;

describe('cifras de paquetes', () => {
  test('cuenta por estado y da el porcentaje de atendidos', () => {
    const f = packageFigures({
      content: [pkg('attended'), pkg('attended'), pkg('pending'), pkg('unattended')],
      totalElements: 4,
    });
    expect(f).toMatchObject({ sample: 4, total: 4, exact: true, attended: 2, pending: 1, unattended: 1, percent: 50 });
  });
  test('si hay más paquetes que la muestra, las cifras son de los más recientes; sin paquetes, 0 %', () => {
    expect(packageFigures({ content: [pkg('attended')], totalElements: 250 })).toMatchObject({
      exact: false,
      total: 250,
    });
    expect(packageFigures({ content: [], totalElements: 0 })).toMatchObject({ sample: 0, percent: 0 });
  });
});

describe('últimas jornadas', () => {
  test('ordena por fecha de creación, las sin fecha al final', () => {
    const items = [journey('a', '2026-01-01T00:00:00Z'), journey('b', null), journey('c', '2026-03-01T00:00:00Z')];
    expect(latestJourneys(items, 2).map((j) => j.id)).toEqual(['c', 'a']);
  });
  test('si el gateway las da de más antigua a más nueva pide la última página', async () => {
    const asc = [journey('1', '2026-01-01T00:00:00Z'), journey('2', '2026-01-02T00:00:00Z')];
    const tail = [journey('9', '2026-02-01T00:00:00Z'), journey('10', '2026-02-02T00:00:00Z')];
    const list = vi.fn(async (p: number) => ({ content: p === 0 ? asc : tail, totalElements: 10 }));
    const out = await fetchLatestJourneys(list, 2);
    expect(list).toHaveBeenCalledWith(4, 2);
    expect(out.map((j) => j.id)).toEqual(['10', '9']);
  });
  test('si la primera página ya viene de más nueva a más antigua no pide más', async () => {
    const desc = [journey('2', '2026-01-02T00:00:00Z'), journey('1', '2026-01-01T00:00:00Z')];
    const list = vi.fn(async () => ({ content: desc, totalElements: 10 }));
    await fetchLatestJourneys(list, 2);
    expect(list).toHaveBeenCalledTimes(1);
  });
});

describe('Inicio con datos', () => {
  test('pinta el anillo con el reparto, la frase y las últimas jornadas', async () => {
    mockGateway({
      'GET /middleware/data/packages?page=0&size=100': page([
        pkg('attended'),
        pkg('attended'),
        pkg('pending'),
        pkg('unattended'),
      ]),
      'GET /middleware/data/journeys?page=0&size=5': page([journey('j1', '2026-11-01T10:00:00Z', 'in_progress')]),
    });
    renderWithI18n(<HomeDashboard />);
    expect(await screen.findByText('2 de 4 paquetes')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Paquetes atendidos: 2 de 4 paquetes' })).toBeInTheDocument();
    expect(screen.getByText('50 %')).toBeInTheDocument();
    expect(screen.getByText('2 atendidos')).toBeInTheDocument();
    expect(screen.getByText('1 pendientes')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Jornada j1' })).toHaveAttribute('href', '/journeys/j1');
    expect(screen.getByText(/12 servicios · 3 vehículos/)).toBeInTheDocument();
  });

  test('sin paquetes ni jornadas invita a crear el primero; un fallo se puede reintentar', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/packages?page=0&size=100': page([]),
      'GET /middleware/data/journeys?page=0&size=5': { status: 500, body: { message: 'caído' } },
    });
    renderWithI18n(<HomeDashboard />);
    expect(await screen.findByText('Todavía no hay paquetes.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear el primer paquete' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument());
    expect(gateway.sent('GET', '/middleware/data/journeys?page=0&size=5').length).toBeGreaterThan(0);
  });
});

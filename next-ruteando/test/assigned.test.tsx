import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AssignedServiceForm } from '@/components/assigned/assigned-service-form';
import { AssignedServiceList } from '@/components/assigned/assigned-service-list';
import { AssignedServicesMap } from '@/components/assigned/assigned-services-map';
import { RouteAssignment } from '@/components/journeys/route-assignment';
import { ToastProvider } from '@/components/ui/toast';
import type { AssignedService, Journey, PlannedJourney } from '@/lib/api/models';
import { assignmentBody, isForRoute, readAssignment } from '@/lib/assigned/contract';
import { dateLabel } from '@/lib/assigned/lookups';
import { assignedRoutes } from '@/lib/assigned/routes';

import { type Call, mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/assigned-services' }));
vi.mock('@/lib/map/openlayers', () => ({ loadOpenLayers: () => Promise.reject(new Error('sin mapa')) }));

const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);
const service = (over: Partial<AssignedService> = {}): AssignedService => ({
  id: 'a1',
  vehicle: { id: 'v1' },
  route: { journeyId: 'j1', routeIndex: 1 },
  driver: { id: 'd1' },
  state: 'ACTIVO',
  executionDate: '2026-03-04T00:00:00Z',
  ...over,
});
const journey = (over: Partial<Journey> = {}): Journey =>
  ({
    id: 'j1',
    name: 'Reparto norte',
    status: 'planned',
    routes: [
      { routeIndex: 0, name: 'Ruta 1', resourceId: 'v1', geoJson: null, waypoints: [] },
      { routeIndex: 1, name: 'Ruta 2', resourceId: 'v2', geoJson: null, waypoints: [] },
    ],
    ...over,
  }) as unknown as Journey;

const LOOKUPS = {
  'GET /middleware/data/journeys?page=0&size=100': page([journey()]),
  'GET /middleware/data/resources?page=0&size=100': page([
    { id: 'v1', name: 'Furgón', licensePlate: 'ABC123', driverId: null },
    { id: 'v2', name: 'Moto', licensePlate: null, driverId: 'd2' },
  ]),
  'GET /middleware/data/users/drivers': [
    { id: 'd1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.invalid' },
    { id: 'd2', firstName: 'Luis', lastName: 'Gómez', email: 'luis@example.invalid' },
  ],
};

beforeEach(() => Object.values(router).forEach((fn) => fn.mockClear()));

describe('contrato', () => {
  test('lee las referencias de forma tolerante y arma el cuerpo con el estado que ya tenía', () => {
    expect(readAssignment(service())).toEqual({
      journeyId: 'j1',
      routeIndex: 1,
      vehicleId: 'v1',
      driverId: 'd1',
      executionDate: '2026-03-04',
    });
    expect(readAssignment({ ...service(), route: { journey: { id: 'j9' }, routeIndex: '3' } })).toMatchObject({
      journeyId: 'j9',
      routeIndex: 3,
    });
    expect(readAssignment({ ...service(), route: null, vehicle: null, driver: null, executionDate: null })).toEqual({
      journeyId: null,
      routeIndex: null,
      vehicleId: null,
      driverId: null,
      executionDate: null,
    });
    expect(isForRoute(service(), 'j1', 1)).toBe(true);
    expect(isForRoute(service(), 'j1', 0)).toBe(false);
    const body = assignmentBody(
      { journeyId: 'j1', routeIndex: 1, vehicleId: 'v1', driverId: 'd1', executionDate: '2026-03-04' },
      'PAUSADO'
    );
    expect(body).toEqual({
      state: 'PAUSADO',
      route: { journeyId: 'j1', routeIndex: 1 },
      vehicle: { id: 'v1' },
      driver: { id: 'd1' },
      executionDate: '2026-03-04',
    });
    expect(dateLabel('2026-03-04', 'es')).toMatch(/4/);
    expect(dateLabel(null, 'es')).toBe('—');
  });

  test('las rutas de jornadas distintas se renumeran y no se repiten', () => {
    const planned = (id: string, name: string) =>
      ({
        id,
        name,
        routes: [
          { routeIndex: 0, name: 'Ruta 1', waypoints: [], geometry: [] },
          { routeIndex: 1, name: 'Ruta 2', waypoints: [], geometry: [] },
        ],
      }) as unknown as PlannedJourney;
    const journeys = new Map([
      ['j1', planned('j1', 'Norte')],
      ['j2', planned('j2', 'Sur')],
    ]);
    const result = assignedRoutes(
      [
        service({ route: { journeyId: 'j1', routeIndex: 0 } }),
        service({ id: 'a2', route: { journeyId: 'j2', routeIndex: 0 } }),
        service({ id: 'a3', route: { journeyId: 'j1', routeIndex: 0 } }), // misma ruta: una sola vez
        service({ id: 'a4', route: { journeyId: 'j9', routeIndex: 0 } }), // jornada que no se leyó
        service({ id: 'a5', route: { journeyId: 'j1', routeIndex: 7 } }), // la jornada ya no tiene esa ruta
      ],
      journeys
    );
    expect(result.routes.map((r) => [r.routeIndex, r.name])).toEqual([
      [0, 'Norte · Ruta 1'],
      [1, 'Sur · Ruta 1'],
    ]);
    expect(result.missing).toBe(2);
  });
});

describe('listado', () => {
  test('pone nombre a la ruta, el vehículo y el conductor, y elimina con confirmación', async () => {
    const gateway = mockGateway({
      ...LOOKUPS,
      'GET /middleware/data/assigned-services': [
        service(),
        service({ id: 'a2', route: null, vehicle: null, driver: null, executionDate: null }),
      ],
      'DELETE /middleware/data/assigned-services/a1': { status: 204 },
    });
    withToasts(<AssignedServiceList />);
    expect(await screen.findByText('Reparto norte · Ruta 2')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0); // el servicio sin referencias legibles
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Reparto norte · Ruta 2' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(gateway.sent('DELETE', '/middleware/data/assigned-services/a1')).toHaveLength(1));
  });
});

describe('formulario', () => {
  test('al elegir la ruta propone su vehículo y al elegir el vehículo, su conductor; crea con la fecha elegida', async () => {
    const gateway = mockGateway({
      ...LOOKUPS,
      'GET /middleware/data/journeys/j1': journey(),
      'POST /middleware/data/assigned-services': (call: Call) => ({ ...(call.body as object), id: 'n' }),
    });
    withToasts(<AssignedServiceForm id={null} journey={null} route={null} />);
    await screen.findByRole('option', { name: 'Reparto norte' });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect((await screen.findAllByText('Este campo es obligatorio')).length).toBeGreaterThanOrEqual(4);

    await userEvent.selectOptions(screen.getByLabelText('Jornada'), 'j1');
    await screen.findByRole('option', { name: 'Ruta 2' });
    await userEvent.selectOptions(screen.getByLabelText('Ruta'), '1');
    await waitFor(() => expect(screen.getByLabelText('Vehículo')).toHaveValue('v2'));
    await waitFor(() => expect(screen.getByLabelText('Conductor')).toHaveValue('d2'));

    await userEvent.clear(screen.getByLabelText('Fecha del servicio'));
    await userEvent.type(screen.getByLabelText('Fecha del servicio'), '2026-04-01');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/assigned-services'));
    expect(gateway.sent('POST', '/middleware/data/assigned-services')[0]!.body).toEqual({
      state: 'ACTIVO',
      route: { journeyId: 'j1', routeIndex: 1 },
      vehicle: { id: 'v2' },
      driver: { id: 'd2' },
      executionDate: '2026-04-01',
    });
  });

  test('con ?journey=&route= abre con la ruta elegida y su vehículo propuesto', async () => {
    mockGateway({ ...LOOKUPS, 'GET /middleware/data/journeys/j1': journey() });
    withToasts(<AssignedServiceForm id={null} journey="j1" route="0" />);
    await waitFor(() => expect(screen.getByLabelText('Ruta')).toHaveValue('0'));
    await waitFor(() => expect(screen.getByLabelText('Vehículo')).toHaveValue('v1'));
    expect(screen.getByLabelText('Jornada')).toHaveValue('j1');
  });

  test('editar conserva el estado que ya tenía el servicio', async () => {
    const gateway = mockGateway({
      ...LOOKUPS,
      'GET /middleware/data/assigned-services/a1': service({ state: 'PAUSADO' }),
      'GET /middleware/data/journeys/j1': journey(),
      'PUT /middleware/data/assigned-services/a1': service(),
    });
    withToasts(<AssignedServiceForm id="a1" journey={null} route={null} />);
    await waitFor(() => expect(screen.getByLabelText('Ruta')).toHaveValue('1'));
    expect(screen.getByLabelText('Fecha del servicio')).toHaveValue('2026-03-04');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/assigned-services'));
    expect(gateway.sent('PUT', '/middleware/data/assigned-services/a1')[0]!.body).toMatchObject({
      state: 'PAUSADO',
      route: { routeIndex: 1 },
    });
  });
});

describe('asignación de una ruta', () => {
  test('sin servicio ofrece asignarla con la ruta ya elegida', async () => {
    mockGateway({ 'GET /middleware/data/assigned-services': [service({ route: { journeyId: 'j1', routeIndex: 9 } })] });
    withToasts(<RouteAssignment journeyId="j1" routeIndex={0} />);
    expect(
      await screen.findByText('Esta ruta todavía no está asignada a un vehículo y un conductor.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Asignar ruta' })).toHaveAttribute(
      'href',
      '/assigned-services/new?journey=j1&route=0'
    );
  });

  test('con servicio muestra quién la lleva y permite cambiarla o quitarla', async () => {
    const gateway = mockGateway({
      ...LOOKUPS,
      'GET /middleware/data/assigned-services': [service()],
      'DELETE /middleware/data/assigned-services/a1': { status: 204 },
    });
    withToasts(<RouteAssignment journeyId="j1" routeIndex={1} />);
    expect(await screen.findByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cambiar' })).toHaveAttribute('href', '/assigned-services/a1');
    await userEvent.click(screen.getByRole('button', { name: 'Quitar asignación' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    expect(
      await screen.findByText('Esta ruta todavía no está asignada a un vehículo y un conductor.')
    ).toBeInTheDocument();
    expect(gateway.sent('DELETE', '/middleware/data/assigned-services/a1')).toHaveLength(1);
  });
});

describe('mapa', () => {
  test('cuenta los servicios cuya ruta no se pudo leer', async () => {
    mockGateway({
      'GET /middleware/data/assigned-services': [
        service({ route: { journeyId: 'j1', routeIndex: 0 } }),
        service({ id: 'a2', route: { journeyId: 'j9', routeIndex: 0 } }),
      ],
      'GET /middleware/data/journeys/j1': journey(),
      'GET /middleware/data/journeys/j9': { status: 404, body: {} },
    });
    withToasts(<AssignedServicesMap />);
    expect(await screen.findByText('1 servicio no se dibuja porque no se pudo leer su ruta.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1\. Reparto norte · Ruta 1/ })).toBeInTheDocument();
  });

  test('sin rutas asignadas lo dice y ofrece asignar', async () => {
    mockGateway({ 'GET /middleware/data/assigned-services': [] });
    withToasts(<AssignedServicesMap />);
    expect(await screen.findByText('Todavía no hay rutas asignadas que dibujar.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Asignar ruta' })).toHaveAttribute('href', '/assigned-services/new');
  });
});

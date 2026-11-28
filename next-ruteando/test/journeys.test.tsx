import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { JourneyDetail } from '@/components/journeys/journey-detail';
import { JourneyForm } from '@/components/journeys/journey-form';
import { JourneyList } from '@/components/journeys/journey-list';
import { RouteDetail } from '@/components/journeys/route-detail';
import { ToastProvider } from '@/components/ui/toast';
import type { Journey, JourneyRoute, Package, Settings, Waypoint } from '@/lib/api/models';
import { ApiError } from '@/lib/api-client';
import { resetMasterDomainsCache } from '@/lib/hooks/use-master-domain';
import { journeyStatusOrder, stopTypeLabel } from '@/lib/journeys/labels';
import { planErrorMessage } from '@/lib/journeys/plan-errors';
import { filterVisits, progressText, type RouteVisit, visitProgress, visitsOf } from '@/lib/journeys/visit-filters';

import { type Call, mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/journeys' }));
vi.mock('@/lib/map/openlayers', () => ({ loadOpenLayers: () => Promise.reject(new Error('sin mapa')) }));

const t = (key: string, args: readonly (string | number)[] = []) =>
  args.reduce<string>((text, a, i) => text.replace(`{${i}}`, String(a)), key);
const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);

const stop = (sequence: number, stopType: string, packageId: string | null, lon = -74.08, lat = 4.6): Waypoint =>
  ({
    sequence,
    stopType,
    packageId,
    packageInfo: null,
    placeId: null,
    coordinates: [lon, lat],
    arrivalUtc: '2026-01-05T13:00:00Z',
    departureUtc: '2026-01-05T13:10:00Z',
  }) as Waypoint;
const route = (over: Partial<JourneyRoute> = {}): JourneyRoute =>
  ({
    routeIndex: 0,
    name: 'Ruta norte',
    resourceId: 'v1',
    resource: { id: 'v1', name: 'Furgón', plate: 'ABC123', resourceTypeName: 'Furgón' },
    geoJson: null,
    startRouteUtc: '2026-01-05T13:00:00Z',
    finishRouteUtc: '2026-01-05T17:00:00Z',
    distanceTraveled: 12500,
    duration: 3700,
    weightUsagePercent: 72.5,
    volumeUsagePercent: null,
    waypoints: [stop(0, 'depot', null), stop(1, 'delivery', 'k1'), stop(2, 'delivery', 'k2', -74.07, 4.61)],
    ...over,
  }) as JourneyRoute;
const journey = (over: Partial<Journey> = {}): Journey =>
  ({
    id: 'j1',
    name: 'Reparto del lunes',
    status: 'planned',
    settingsId: 's1',
    settings: { id: 's1', name: 'Turno mañana', routeTopology: 'round_trip', restrictionType: 'fixed_routes' },
    totalServices: 2,
    totalResources: 1,
    totalZones: 0,
    stats: { minTime: 60, avgTime: 3700, maxTime: 7300 },
    invalidPackageIds: ['k9'],
    routes: [route()],
    createdAt: '2026-01-05T12:00:00Z',
    ...over,
  }) as Journey;
const pkg = (id: string, name: string, status = 'pending', over: Partial<Package> = {}): Package =>
  ({
    id,
    name,
    guideNumber: null,
    address: `Calle ${name}`,
    status,
    serviceType: 'delivery',
    weight: 1,
    volume: 1,
    location: { type: 'Point', coordinates: [-74, 4.6] },
    ...over,
  }) as Package;

beforeEach(() => {
  Object.values(router).forEach((fn) => fn.mockClear());
  resetMasterDomainsCache();
});

describe('lógica de jornadas', () => {
  test('los errores de planificación del gateway se explican; los demás no se tocan', () => {
    expect(planErrorMessage(new ApiError(400, 'x', undefined, { message: 'For input string: "ab"' }), t)).toBe(
      'No se pudo planificar la jornada: For input string: "ab"'
    );
    expect(planErrorMessage(new ApiError(422, 'x'), t)).toBe('No se pudo planificar la jornada');
    expect(planErrorMessage(new ApiError(404, 'x'), t)).toMatch(/ya no existe/);
    expect(planErrorMessage(new ApiError(504, 'x'), t)).toMatch(/tardó demasiado/);
    expect(planErrorMessage(new ApiError(500, 'x'), t)).toBeUndefined();
    expect(planErrorMessage(new Error('x'), t)).toBeUndefined();
  });

  test('las visitas son las paradas con paquete y el filtro mira estado, nombre y dirección', () => {
    const visits = visitsOf(route().waypoints.map((w) => ({ ...w, position: { lat: 4.6, lng: -74 } })) as never);
    expect(visits.map((v) => v.packageId)).toEqual(['k1', 'k2']);
    const ready: RouteVisit[] = visits.map((v, i) => ({
      ...v,
      state: 'ready',
      pkg: pkg(v.packageId, i ? 'Beta' : 'Álamo', i ? 'attended' : 'pending'),
    }));
    expect(filterVisits(ready, { status: 'attended', text: '' }).map((v) => v.packageId)).toEqual(['k2']);
    expect(filterVisits(ready, { status: '', text: 'alamo' }).map((v) => v.packageId)).toEqual(['k1']); // sin tildes
    expect(visitProgress(ready)).toEqual({ attended: 1, total: 2 });
    expect(progressText({ attended: 1, total: 2 }, t)).toBe('1 de 2 visitas atendidas');
    expect(progressText({ attended: 0, total: 0 }, t)).toBe('Esta ruta no tiene visitas');
    expect(journeyStatusOrder([{ status: 'planned' }, { status: 'rara' }]).at(-1)).toBe('rara');
    expect(stopTypeLabel('depot', t)).toBe('Depósito');
  });
});

describe('listado y planificación', () => {
  test('el listado cuenta por estado y enlaza al detalle', async () => {
    mockGateway({
      'GET /middleware/data/journeys?page=0&size=100': page([
        journey({ routes: null }),
        journey({ id: 'j2', name: 'Otra', status: 'completed', routes: null }),
      ]),
    });
    withToasts(<JourneyList />);
    expect(await screen.findByRole('link', { name: 'Reparto del lunes' })).toHaveAttribute('href', '/journeys/j1');
    const chips = screen.getByRole('group', { name: 'Estado' });
    expect(within(chips).getByRole('button', { name: /Planificada 1/ })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: /Completada 1/ })).toBeInTheDocument();
  });

  const setup = (extra: Record<string, unknown> = {}) =>
    mockGateway({
      'GET /middleware/data/settings?page=0&size=200': page([{ id: 's1', description: 'Turno mañana' } as Settings]),
      'GET /middleware/data/packages?page=0&size=100': page([
        pkg('k1', 'A'),
        pkg('k2', 'B', 'attended'),
        pkg('k3', 'C'),
      ]),
      ...extra,
    });

  test('exige nombre, configuración y al menos un paquete; «todos los pendientes» no suma los atendidos', async () => {
    const gateway = setup({
      'POST /middleware/data/journeys/plan': (call: Call) => ({
        ...journey(),
        name: (call.body as { name: string }).name,
      }),
    });
    withToasts(<JourneyForm />);
    await screen.findAllByRole('option', { name: 'Turno mañana' });
    await userEvent.click(screen.getByRole('button', { name: 'Planificar' }));
    expect(await screen.findAllByText('Este campo es obligatorio')).toHaveLength(2);
    expect(screen.getByText('Elige al menos un paquete')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nombre de la jornada'), 'Lunes');
    await userEvent.selectOptions(screen.getByLabelText('Configuración'), 's1');
    await screen.findByText('A');
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar todos los pendientes' }));
    expect(screen.getByText('2 paquetes seleccionados')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Seleccionar paquete B' })).not.toBeChecked();
    expect(screen.getAllByText('2 paquetes')).not.toHaveLength(0); // el resumen «Revisa»

    await userEvent.click(screen.getByRole('button', { name: 'Planificar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/journeys/j1'));
    expect(gateway.sent('POST', '/middleware/data/journeys/plan')[0]!.body).toEqual({
      name: 'Lunes',
      settingsId: 's1',
      packageIds: expect.arrayContaining(['k1', 'k3']),
    });
  });

  test('un fallo del gateway al planificar se muestra con su mensaje y se puede reintentar', async () => {
    setup({
      'POST /middleware/data/journeys/plan': { status: 400, body: { message: 'For input string: "5f6f"' } },
    });
    withToasts(<JourneyForm />);
    await screen.findAllByRole('option', { name: 'Turno mañana' });
    await userEvent.type(screen.getByLabelText('Nombre de la jornada'), 'X');
    await userEvent.selectOptions(screen.getByLabelText('Configuración'), 's1');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar paquete A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Planificar' }));
    expect(await screen.findByText('No se pudo planificar la jornada: For input string: "5f6f"')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Planificar' })).toBeEnabled();
  });
});

describe('detalle', () => {
  test('resumen, rutas con sus cifras, paradas desplegables y paquetes no planificados', async () => {
    mockGateway({ 'GET /middleware/data/journeys/j1': journey() });
    withToasts(<JourneyDetail id="j1" />);
    expect(await screen.findByRole('heading', { name: 'Reparto del lunes' })).toBeInTheDocument();
    expect(screen.getByText('Planificada')).toBeInTheDocument();
    expect(screen.getByText('Turno mañana')).toBeInTheDocument();
    expect(screen.getByText('Furgón (ABC123)')).toBeInTheDocument();
    expect(screen.getByText('12,5 km')).toBeInTheDocument();
    expect(screen.getByText('72,5 %')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la ruta Ruta norte' })).toHaveAttribute(
      'href',
      '/journeys/j1/routes/0'
    );
    expect(screen.getByRole('link', { name: 'k9' })).toHaveAttribute('href', '/packages/k9');

    await userEvent.click(screen.getByRole('button', { name: 'Ver las paradas de Ruta norte' }));
    expect(screen.getByRole('table', { name: 'Paradas de Ruta norte' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Ver la parada \d de Ruta norte en el mapa/ })).toHaveLength(3);
    // el mapa «no carga» (OpenLayers real necesita canvas): se avisa y la leyenda y las tablas siguen
    expect(await screen.findByText(/No se pudo cargar el mapa/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1\. Ruta norte/ })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: /1\. Ruta norte/ }));
    expect(screen.getByRole('button', { name: /1\. Ruta norte/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ruta enfocada: Ruta norte')).toBeInTheDocument();
  });

  test('una jornada que no existe vuelve al listado', async () => {
    mockGateway({ 'GET /middleware/data/journeys/zz': { status: 404, body: {} } });
    withToasts(<JourneyDetail id="zz" />);
    expect(await screen.findByText('No se encontró el recurso solicitado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al listado' })).toHaveAttribute('href', '/journeys');
  });
});

describe('detalle de la ruta y seguimiento de visitas', () => {
  const setup = () =>
    mockGateway({
      'GET /middleware/data/journeys/j1': journey(),
      'GET /middleware/data/master-domains': [],
      'GET /middleware/data/packages/k1': pkg('k1', 'Ana', 'pending'),
      'GET /middleware/data/packages/k2': { status: 404, body: {} },
      'PATCH /middleware/data/packages/k1/status/attended': pkg('k1', 'Ana', 'attended'),
      'PATCH /middleware/data/packages/k1/status/cancelled': pkg('k1', 'Ana', 'cancelled'),
    });

  test('lee un paquete por visita, marca «No disponible» al que falla y cambia el estado de la fila', async () => {
    const gateway = setup();
    withToasts(<RouteDetail journeyId="j1" routeIndex="0" />);
    expect(await screen.findByRole('heading', { name: 'Ruta norte' })).toBeInTheDocument();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getAllByText('No disponible')).toHaveLength(2); // la etiqueta de la fila y la opción del filtro
    expect(screen.getByText('0 de 2 visitas atendidas')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar el estado de la visita Ana' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Atendido' }));
    await waitFor(() => expect(gateway.sent('PATCH', '/middleware/data/packages/k1/status/attended')).toHaveLength(1));
    expect(await screen.findByText('1 de 2 visitas atendidas')).toBeInTheDocument();
  });

  test('cancelar una visita pide confirmar y volver no llama al gateway', async () => {
    const gateway = setup();
    withToasts(<RouteDetail journeyId="j1" routeIndex="0" />);
    await screen.findByText('Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar el estado de la visita Ana' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cancelado' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(gateway.sent('PATCH', '/middleware/data/packages/k1/status/cancelled')).toHaveLength(0);
  });

  test('filtra por estado y por texto, y se limpia', async () => {
    setup();
    withToasts(<RouteDetail journeyId="j1" routeIndex="0" />);
    await screen.findByText('Ana');
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'unavailable');
    expect(screen.queryByText('Ana')).toBeNull();
    expect(screen.getByText('1 de 2 visitas coinciden con los filtros')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Estado'), '');
    await userEvent.type(screen.getByLabelText('Buscar por nombre o dirección'), 'zzz');
    expect(screen.getByText('Ninguna visita coincide con los filtros.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  test('una ruta que no existe en la jornada lo dice y vuelve a la jornada', async () => {
    setup();
    withToasts(<RouteDetail journeyId="j1" routeIndex="7" />);
    expect(await screen.findByText('El registro ya no existe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a la jornada' })).toHaveAttribute('href', '/journeys/j1');
  });
});

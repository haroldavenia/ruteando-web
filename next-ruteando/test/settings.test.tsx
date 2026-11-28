import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SettingsForm } from '@/components/settings/settings-form';
import { SettingsList } from '@/components/settings/settings-list';
import { Switch } from '@/components/ui/switch';
import { ToastProvider } from '@/components/ui/toast';
import type { Place, Settings } from '@/lib/api/models';
import { resetMasterDomainsCache } from '@/lib/hooks/use-master-domain';
import { describeSettings } from '@/lib/settings/labels';
import { buildSettingsUpdateBody } from '@/lib/settings/settings-body';

import { type Call, mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/settings' }));

const t = (key: string, args: readonly (string | number)[] = []) =>
  args.reduce<string>((text, a, i) => text.replace(`{${i}}`, String(a)), key);
const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);

const place = (id: string, name: string) => ({ id, name }) as Place;
const settings = (over: Partial<Settings> = {}): Settings =>
  ({
    id: 's1',
    tenantId: 'x',
    description: 'Turno mañana',
    routeTopology: 'round_trip',
    restrictionType: 'resource_vs_time',
    placeStartId: 'p1',
    placeEndId: 'p1',
    evaluateWeight: true,
    evaluateVolume: false,
    evaluateItineraryZone: false,
    fixedRoutes: null,
    lengthOfStay: 90,
    typeLengthOfStay: 'fixed',
    shiftStartUtc: '2026-01-05T13:00:00Z',
    shiftDurationSec: 28800,
    breakDurationSec: 3600,
    resourceIds: ['v1', 'v2'],
    active: true,
    globalShiftActive: true,
    globalBreakActive: false,
    placeStart: { id: 'p1', name: 'Depósito' },
    placeEnd: null,
    resources: [],
    createdAt: '',
    updatedAt: '',
    createdBy: 'u',
    ...over,
  }) as Settings;

const PLACES = page([place('p1', 'Depósito'), place('p2', 'Bodega')]);

beforeEach(() => {
  Object.values(router).forEach((fn) => fn.mockClear());
  resetMasterDomainsCache();
});

describe('descripción de la configuración', () => {
  const base = {
    restrictionType: '',
    routeTopology: '',
    fixedRoutes: null,
    shiftDurationMin: null,
    placeStartName: null,
    placeEndName: null,
    vehicleCount: 0,
    evaluateWeight: false,
    evaluateVolume: false,
    evaluateItineraryZone: false,
  };

  test('solo da formato a lo que hay y no inventa lo que falta', () => {
    expect(describeSettings(base, t)).toBe('Planificará rutas.');
    expect(
      describeSettings(
        {
          ...base,
          restrictionType: 'fixed_routes',
          fixedRoutes: 3,
          routeTopology: 'round_trip',
          placeStartName: 'Depósito',
          placeEndName: 'Bodega',
          vehicleCount: 3,
          evaluateWeight: true,
          evaluateVolume: true,
          evaluateItineraryZone: true,
        },
        t
      )
    ).toBe(
      'Planificará 3 rutas (ida y vuelta) desde Depósito hasta Bodega, con 3 vehículos, evaluando peso, volumen y zona del itinerario.'
    );
    expect(describeSettings({ ...base, restrictionType: 'resource_vs_time', shiftDurationMin: 90 }, t)).toBe(
      'Planificará rutas con turnos de 1 h 30 min.'
    );
    expect(
      describeSettings(
        { ...base, restrictionType: 'fixed_routes', fixedRoutes: 1, placeStartName: 'A', placeEndName: 'A' },
        t
      )
    ).toBe('Planificará 1 ruta desde A.');
  });

  test('el PUT conserva lo que no se edita y quita los resúmenes', () => {
    const body = buildSettingsUpdateBody(settings(), { description: 'Otra' });
    expect(body).toMatchObject({
      description: 'Otra',
      globalShiftActive: true,
      active: true,
      resourceIds: ['v1', 'v2'],
    });
    for (const gone of ['id', 'tenantId', 'placeStart', 'placeEnd', 'resources', 'createdBy'])
      expect(body).not.toHaveProperty(gone);
  });
});

describe('interruptor', () => {
  test('es un interruptor de verdad: rol, estado y teclado', async () => {
    const onChange = vi.fn();
    renderWithI18n(<Switch checked={false} onChange={onChange} label="Evaluar peso" />);
    const toggle = screen.getByRole('switch', { name: 'Evaluar peso' });
    expect(toggle).not.toBeChecked();
    toggle.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('listado', () => {
  test('muestra topología, restricción, salida y vehículos', async () => {
    mockGateway({ 'GET /middleware/data/settings?page=0&size=100': page([settings()]) });
    withToasts(<SettingsList />);
    expect(await screen.findByText('Turno mañana')).toBeInTheDocument();
    expect(screen.getByText('Ida y vuelta')).toBeInTheDocument();
    expect(screen.getByText('Recursos y tiempo')).toBeInTheDocument();
    expect(screen.getByText('Depósito')).toBeInTheDocument();
  });
});

describe('formulario', () => {
  const fill = async () => {
    await userEvent.type(screen.getByLabelText('Descripción'), 'Reparto');
    await userEvent.selectOptions(screen.getByLabelText('Topología de la ruta'), 'round_trip');
    await userEvent.selectOptions(screen.getByLabelText('Lugar de salida'), 'p1');
  };

  test('con rutas fijas no hay turno ni peso ni volumen y pide el número de rutas', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/master-domains': [],
      'GET /middleware/data/places?page=0&size=200': PLACES,
      'POST /middleware/data/settings': (call: Call) => ({ ...(call.body as object), id: 'n' }),
    });
    withToasts(<SettingsForm id={null} />);
    await screen.findAllByRole('option', { name: 'Bodega' });
    await fill();
    await userEvent.selectOptions(screen.getByLabelText('Tipo de restricción'), 'fixed_routes');
    expect(screen.queryByLabelText('Duración del turno')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Evaluar peso' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Evaluar zona del itinerario' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Este campo es obligatorio')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Número de rutas'), '3');
    expect(screen.getByText(/Planificará 3 rutas \(ida y vuelta\) desde Depósito/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/settings'));
    const body = gateway.sent('POST', '/middleware/data/settings')[0]!.body as Record<string, unknown>;
    expect(body).toMatchObject({
      description: 'Reparto',
      restrictionType: 'fixed_routes',
      fixedRoutes: 3,
      placeStartId: 'p1',
    });
    for (const gone of ['shiftStartUtc', 'shiftDurationSec', 'evaluateWeight', 'resourceIds'])
      expect(body).not.toHaveProperty(gone);
  });

  test('turno, descanso y estancia se escriben como 1h 30m y se validan', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/master-domains': [],
      'GET /middleware/data/places?page=0&size=200': PLACES,
      'POST /middleware/data/settings': { id: 'n' },
    });
    withToasts(<SettingsForm id={null} />);
    await screen.findAllByRole('option', { name: 'Bodega' });
    await fill();
    await userEvent.selectOptions(screen.getByLabelText('Tipo de restricción'), 'resource_vs_time');
    await userEvent.click(screen.getByRole('switch', { name: 'Evaluar peso' }));
    await userEvent.selectOptions(screen.getByLabelText('Estancia en cada parada (opcional)'), 'fixed');

    await userEvent.clear(screen.getByLabelText('Duración del turno'));
    await userEvent.type(screen.getByLabelText('Duración del turno'), '30h');
    await userEvent.clear(screen.getByLabelText('Descanso'));
    await userEvent.type(screen.getByLabelText('Descanso'), 'una hora');
    await userEvent.type(screen.getByLabelText('Estancia'), '0m');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El turno no puede durar más de 24 horas (1440 minutos)')).toBeInTheDocument();
    expect(screen.getByText('Usa el formato 2h 45m (h = horas, m = minutos)')).toBeInTheDocument();
    expect(screen.getByText('Escribe un valor mayor que 0')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Duración del turno'));
    await userEvent.type(screen.getByLabelText('Duración del turno'), '7h 30m');
    await userEvent.clear(screen.getByLabelText('Descanso'));
    await userEvent.type(screen.getByLabelText('Descanso'), '45m');
    await userEvent.clear(screen.getByLabelText('Estancia'));
    await userEvent.type(screen.getByLabelText('Estancia'), '1h 30m');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/settings'));
    expect(gateway.sent('POST', '/middleware/data/settings')[0]!.body).toMatchObject({
      shiftDurationSec: 27000,
      breakDurationSec: 2700,
      lengthOfStay: 90, // la estancia se envía en minutos
      typeLengthOfStay: 'fixed',
      evaluateWeight: true,
    });
  }, 20000);

  test('editar muestra lo guardado, reenvía la flota y deja en null lo que no aplica', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/settings/s1': settings(),
      'GET /middleware/data/master-domains': [],
      'GET /middleware/data/places?page=0&size=200': PLACES,
      'PUT /middleware/data/settings/s1': settings(),
    });
    withToasts(<SettingsForm id="s1" />);
    expect(await screen.findByDisplayValue('Turno mañana')).toBeInTheDocument();
    expect(screen.getByLabelText('Duración del turno')).toHaveValue('8h');
    expect(screen.getByLabelText('Descanso')).toHaveValue('1h');
    expect(screen.getByLabelText('Estancia')).toHaveValue('1h 30m');
    await userEvent.selectOptions(screen.getByLabelText('Tipo de restricción'), 'fixed_routes');
    await userEvent.type(screen.getByLabelText('Número de rutas'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/settings'));
    expect(gateway.sent('PUT', '/middleware/data/settings/s1')[0]!.body).toMatchObject({
      resourceIds: ['v1', 'v2'],
      globalShiftActive: true,
      fixedRoutes: 2,
      shiftStartUtc: null,
      shiftDurationSec: null,
      breakDurationSec: null,
      evaluateWeight: false,
      lengthOfStay: 90,
    });
    const group = screen.queryByRole('group', { name: 'Qué evalúa la planificación' });
    expect(group && within(group).queryByRole('switch', { name: 'Evaluar peso' })).toBeNull();
  });
});

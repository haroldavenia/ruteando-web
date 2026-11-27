import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { AuditFiltersBar } from '@/components/audit/audit-filters-bar';
import { DriverList } from '@/components/fleet/driver-list';
import { ResourceForm } from '@/components/fleet/resource-form';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { ToastProvider } from '@/components/ui/toast';
import type { Resource, User } from '@/lib/api/models';
import { type AuditFilters, EMPTY_FILTERS, NO_PERSON } from '@/lib/audit/filters';

import { type Call, mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/fleet/drivers' }));

const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);

beforeEach(() => {
  router.push.mockClear();
});

describe('registro del service worker', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error -- se retira el simulado
    delete navigator.serviceWorker;
  });

  test('en producción registra /sw.js con alcance raíz; fuera de producción no hace nada', () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    renderWithI18n(<ServiceWorkerRegister />);
    expect(register).not.toHaveBeenCalled(); // NODE_ENV = test
    vi.stubEnv('NODE_ENV', 'production');
    renderWithI18n(<ServiceWorkerRegister />);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
  });

  test('un fallo al registrar no rompe la página', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const register = vi.fn().mockRejectedValue(new Error('no'));
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    const { container } = renderWithI18n(<ServiceWorkerRegister />);
    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('listado de conductores', () => {
  const driver = (over: Partial<User> = {}): User =>
    ({
      id: 'd1',
      email: 'ana@example.invalid',
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '3001234567',
      role: 'driver',
      active: true,
      identifierType: 'citizen_id',
      identifierValue: '999',
      ...over,
    }) as User;

  test('muestra los conductores y envía el enlace de restablecimiento tras confirmar', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/users/drivers': [
        driver(),
        driver({ id: 'd2', email: 'luis@example.invalid', firstName: 'Luis', active: false }),
      ],
      'POST /middleware/data/users/d1/reset-password': {},
    });
    withToasts(<DriverList />);
    expect(await screen.findByText('ana@example.invalid')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Enviar enlace de restablecimiento a ana@example.invalid' })
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/ana@example.invalid/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar enlace' }));
    await waitFor(() => expect(gateway.sent('POST', '/middleware/data/users/d1/reset-password')).toHaveLength(1));
    expect(await screen.findByText('Enlace de restablecimiento enviado a ana@example.invalid')).toBeInTheDocument();
  });

  test('si el envío falla lo dice y no avisa de éxito', async () => {
    mockGateway({
      'GET /middleware/data/users/drivers': [driver()],
      'POST /middleware/data/users/d1/reset-password': { status: 500, body: { message: 'caído' } },
    });
    withToasts(<DriverList />);
    await userEvent.click(await screen.findByRole('button', { name: /Enviar enlace de restablecimiento a/ }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Enviar enlace' }));
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
  });

  test('cancelar la confirmación no envía nada', async () => {
    const gateway = mockGateway({ 'GET /middleware/data/users/drivers': [driver()] });
    withToasts(<DriverList />);
    await userEvent.click(await screen.findByRole('button', { name: /Enviar enlace de restablecimiento a/ }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(gateway.sent('POST', '/middleware/data/users/d1/reset-password')).toHaveLength(0);
  });
});

describe('formulario de vehículo', () => {
  const routes = (extra: Record<string, unknown> = {}) => ({
    'GET /middleware/data/resource-types?page=0&size=200': page([{ id: 't1', name: 'Furgón' }]),
    'GET /middleware/data/places?page=0&size=200': page([{ id: 'p1', name: 'Bodega' }]),
    ...extra,
  });

  test('exige lo básico y crea el vehículo con solo lo que se aparta del valor por defecto', async () => {
    const gateway = mockGateway(routes({ 'POST /middleware/data/resources': {} }));
    withToasts(<ResourceForm id={null} createdTypeId={null} />);
    await screen.findByRole('option', { name: 'Furgón' });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect((await screen.findAllByText('Este campo es obligatorio')).length).toBeGreaterThanOrEqual(2);
    expect(gateway.sent('POST', '/middleware/data/resources')).toHaveLength(0);

    await userEvent.type(screen.getByLabelText('Nombre'), 'Camioneta 1');
    await userEvent.selectOptions(screen.getByLabelText('Tipo de vehículo'), 't1');
    await userEvent.selectOptions(screen.getByLabelText('Depósito'), 'p1');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fleet/vehicles'));
    const body = gateway.sent('POST', '/middleware/data/resources')[0]!.body as Record<string, unknown>;
    expect(body).toMatchObject({
      name: 'Camioneta 1',
      resourceTypeId: 't1',
      depotId: 'p1',
      shiftDurationSec: 28800,
      breakDurationSec: 3600,
    });
    expect(body).not.toHaveProperty('licensePlate');
    expect(body).not.toHaveProperty('quantity');
  });

  test('valida el turno, el descanso y la cantidad', async () => {
    mockGateway(routes());
    withToasts(<ResourceForm id={null} createdTypeId={null} />);
    await screen.findByRole('option', { name: 'Furgón' });
    await userEvent.clear(screen.getByLabelText('Duración del turno (minutos)'));
    await userEvent.type(screen.getByLabelText('Duración del turno (minutos)'), '2000');
    await userEvent.clear(screen.getByLabelText('Duración del descanso (minutos)'));
    await userEvent.type(screen.getByLabelText('Duración del descanso (minutos)'), '-5');
    await userEvent.clear(screen.getByLabelText('Cantidad'));
    await userEvent.type(screen.getByLabelText('Cantidad'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El turno no puede durar más de 24 horas (1440 minutos)')).toBeInTheDocument();
    expect(screen.getByText('El descanso no puede ser negativo')).toBeInTheDocument();
    expect(screen.getByText('La cantidad debe ser al menos 1')).toBeInTheDocument();
  });

  test('editar reenvía lo que la pantalla no toca y avisa de una matrícula repetida', async () => {
    const existing = {
      id: 'v1',
      name: 'Camioneta',
      licensePlate: 'ABC123',
      resourceTypeId: 't1',
      depotId: 'p1',
      shiftStartUtc: '2026-01-01T13:00:00Z',
      shiftDurationSec: 28800,
      breakDurationSec: 3600,
      quantity: 2,
      allowedPackageTypes: ['delivery'],
      allowedZoneIds: ['z1'],
    } as unknown as Resource;
    const gateway = mockGateway(
      routes({
        'GET /middleware/data/resources/v1': existing,
        'PUT /middleware/data/resources/v1': (call: Call) =>
          (call.body as { licensePlate: string | null }).licensePlate === 'ABC123'
            ? { status: 409, body: { message: 'dup' } }
            : {},
      })
    );
    withToasts(<ResourceForm id="v1" createdTypeId={null} />);
    expect(await screen.findByDisplayValue('Camioneta')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ya existe un vehículo con esa matrícula')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Matrícula (opcional)'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fleet/vehicles'));
    expect(gateway.sent('PUT', '/middleware/data/resources/v1').at(-1)!.body).toMatchObject({
      licensePlate: null,
      quantity: 2,
      allowedPackageTypes: ['delivery'],
      allowedZoneIds: ['z1'],
    });
  });

  test('sin tipos ni lugares lo dice y «Crear tipo» guarda el borrador y va al formulario de tipos', async () => {
    mockGateway({
      'GET /middleware/data/resource-types?page=0&size=200': page([]),
      'GET /middleware/data/places?page=0&size=200': page([]),
    });
    withToasts(<ResourceForm id={null} createdTypeId={null} />);
    expect(await screen.findByText(/Todavía no hay tipos de vehículo/)).toBeInTheDocument();
    expect(screen.getByText(/Todavía no hay lugares que usar como depósito/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nombre'), 'Borrador');
    await userEvent.click(screen.getByRole('button', { name: 'Crear tipo' }));
    expect(router.push).toHaveBeenCalledWith('/fleet/types/new?volver=%2Ffleet%2Fvehicles%2Fnew');
  });
});

describe('filtros de auditoría', () => {
  function setup(over: Partial<AuditFilters> = {}, props: { showPeople?: boolean; entityLabel?: string | null } = {}) {
    const onChange = vi.fn();
    const onTechnical = vi.fn();
    const onClear = vi.fn();
    renderWithI18n(
      <AuditFiltersBar
        filters={{ ...EMPTY_FILTERS, ...over }}
        people={['ana@example.invalid']}
        hasUnidentified
        technical={false}
        showPeople={props.showPeople ?? true}
        entityLabel={props.entityLabel ?? null}
        onChange={onChange}
        onTechnical={onTechnical}
        onClear={onClear}
      />
    );
    return { onChange, onTechnical, onClear };
  }

  test('elegir un rango fijo quita las fechas; «Personalizado» se abre ya aplicado a los últimos siete días', async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: '7 días' }));
    expect(onChange).toHaveBeenLastCalledWith({ range: '7d', from: null, to: null });
    await userEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ range: 'personalizado', from: expect.any(String), to: expect.any(String) })
    );
    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
  });

  test('un rango al revés se señala en lugar de aplicarse', async () => {
    const { onChange } = setup({ range: 'personalizado', from: '2026-11-10', to: '2026-11-20' });
    onChange.mockClear();
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-12-01' } });
    expect(await screen.findByText('El inicio no puede ser posterior al fin')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ from: '2026-12-01' }));
  });

  test('vaciar las dos fechas vuelve a «Todo»', async () => {
    const { onChange } = setup({ range: 'personalizado', from: '2026-11-10', to: null });
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ range: 'todo', from: null, to: null });
  });

  test('tipo, persona (con «Sin identificar»), solo cambios, datos técnicos y quitar la entidad', async () => {
    const { onChange, onTechnical } = setup({ entityId: 'abcdef1234567890' }, { entityLabel: 'Vehículo' });
    await userEvent.selectOptions(screen.getByLabelText('Tipo de acción'), 'creacion');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'creacion' });
    await userEvent.selectOptions(screen.getByLabelText('Tipo de acción'), 'todos');
    expect(onChange).toHaveBeenLastCalledWith({ kind: null });
    await userEvent.selectOptions(screen.getByLabelText('Persona'), NO_PERSON);
    expect(onChange).toHaveBeenLastCalledWith({ person: NO_PERSON });
    await userEvent.selectOptions(screen.getByLabelText('Persona'), 'ana@example.invalid');
    expect(onChange).toHaveBeenLastCalledWith({ person: 'ana@example.invalid' });
    await userEvent.click(screen.getByRole('switch', { name: 'Solo con cambios de valores' }));
    expect(onChange).toHaveBeenLastCalledWith({ onlyChanges: true });
    await userEvent.click(screen.getByRole('switch', { name: 'Mostrar datos técnicos' }));
    expect(onTechnical).toHaveBeenCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar el filtro de entidad' }));
    expect(onChange).toHaveBeenLastCalledWith({ entityId: null });
  });

  test('en «Mi actividad» no se ofrece elegir persona', () => {
    setup({}, { showPeople: false });
    expect(screen.queryByLabelText('Persona')).toBeNull();
  });
});

describe('listado de vehículos: retirar conductor y tarjetas', () => {
  const vehicle = (over: Record<string, unknown> = {}) => ({
    id: 'v1',
    name: 'Camioneta',
    licensePlate: 'ABC123',
    resourceTypeId: 't1',
    driverId: 'd1',
    active: true,
    resourceType: { id: 't1', name: 'Furgón' },
    assignedUser: { id: 'd1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.invalid' },
    ...over,
  });
  const list = () =>
    page([
      vehicle(),
      vehicle({ id: 'v2', name: 'Moto', licensePlate: null, driverId: null, assignedUser: null, active: false }),
    ]);

  test('retirar el conductor pide confirmación y avisa; un fallo se muestra', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/resources?page=0&size=100': list(),
      'DELETE /middleware/data/resources/v1/driver': {},
    });
    const { ResourceList } = await import('@/components/fleet/resource-list');
    withToasts(<ResourceList />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ver como tabla' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Retirar conductor del vehículo ABC123' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Ana Pérez/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retirar' }));
    await waitFor(() => expect(gateway.sent('DELETE', '/middleware/data/resources/v1/driver')).toHaveLength(1));
    expect(await screen.findByText(/ya no tiene conductor/)).toBeInTheDocument();
  });

  test('cancelar no retira nada y si el gateway falla lo dice', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/resources?page=0&size=100': list(),
      'DELETE /middleware/data/resources/v1/driver': { status: 500, body: { message: 'caído' } },
    });
    const { ResourceList } = await import('@/components/fleet/resource-list');
    withToasts(<ResourceList />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ver como tabla' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Retirar conductor del vehículo ABC123' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(gateway.sent('DELETE', '/middleware/data/resources/v1/driver')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Retirar conductor del vehículo ABC123' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Retirar' }));
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
  });

  test('la vista de tarjetas muestra el conductor, «Sin conductor», la matrícula y el estado', async () => {
    mockGateway({ 'GET /middleware/data/resources?page=0&size=100': list() });
    const { ResourceList } = await import('@/components/fleet/resource-list');
    withToasts(<ResourceList />);
    await screen.findByText('Camioneta');
    await userEvent.click(screen.getByRole('button', { name: 'Ver como tarjetas' }));
    expect(await screen.findByText('ana@example.invalid')).toBeInTheDocument();
    expect(screen.getByText('Sin conductor')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Editar' })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Asignar conductor al vehículo Moto' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

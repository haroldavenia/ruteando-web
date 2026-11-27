import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { DriverForm } from '@/components/fleet/driver-form';
import { ResourceList } from '@/components/fleet/resource-list';
import { ResourceTypeForm } from '@/components/fleet/resource-type-form';
import { ResourceTypeList } from '@/components/fleet/resource-type-list';
import { ToastProvider } from '@/components/ui/toast';
import type { Resource, ResourceType, User } from '@/lib/api/models';
import { csvCell, parseCsv, toCsv } from '@/lib/csv';
import { EMPTY_CAPACITY } from '@/lib/fleet/capacity-codec';
import { capacityIssues } from '@/lib/fleet/capacity-rules';
import { fleetReturnUrl, saveDraft, takeDraft, withCreatedType } from '@/lib/fleet/type-handoff';
import { runBulk } from '@/lib/hooks/use-delete';
import { resetMasterDomainsCache } from '@/lib/hooks/use-master-domain';

import { type Call, mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/fleet/types' }));

const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);
const identity = (key: string, args: readonly (string | number)[] = []) =>
  args.reduce<string>((text, a, i) => text.replace(`{${i}}`, String(a)), key);

const type = (over: Partial<ResourceType> = {}): ResourceType => ({
  id: 't1',
  tenantId: 'x',
  category: 'van',
  name: 'Furgón',
  osrmProfile: 'driving',
  capacity: { weight: 500, volume: 12_000_000 },
  measure: null,
  restriction: null,
  gasMileage: null,
  active: true,
  createdAt: '',
  updatedAt: '',
  ...over,
});
const driver = (over: Partial<User> = {}): User => ({
  id: 'd1',
  email: 'ana@example.invalid',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: null,
  role: 'driver',
  tenantId: 'x',
  createdAt: '',
  active: true,
  identifierType: null,
  identifierValue: null,
  avatar: null,
  lastLoginAt: null,
  updatedAt: null,
  ...over,
});

beforeEach(() => {
  Object.values(router).forEach((fn) => fn.mockClear());
  resetMasterDomainsCache();
  sessionStorage.clear();
});

describe('lógica de flota', () => {
  test('la capacidad vacía es válida y las incoherentes se señalan por campo', () => {
    expect(capacityIssues(EMPTY_CAPACITY, identity)).toEqual({});
    const issues = capacityIssues(
      { ...EMPTY_CAPACITY, weight: 100, volume: 10, maxWeight: 200, minVolume: 5, maxVolume: 2 },
      identity
    );
    expect(issues.maxWeight).toBe('El peso máximo no puede superar el peso del vehículo');
    expect(issues.maxVolume).toBe('El máximo no puede ser menor que el mínimo');
    expect(capacityIssues({ ...EMPTY_CAPACITY, weight: 100 }, identity).volume).toBe('Indica un volumen mayor que 0');
    expect(capacityIssues({ ...EMPTY_CAPACITY, weight: -1 }, identity).weight).toBe('No puede ser negativo');
    expect(
      capacityIssues({ ...EMPTY_CAPACITY, mode: 'measure', weight: 1, width: 1, height: null, depth: 0 }, identity)
    ).toMatchObject({ height: 'Indica una medida mayor que 0', depth: 'Indica una medida mayor que 0' });
  });

  test('el CSV protege las celdas que una hoja de cálculo leería como fórmula y se lee de vuelta', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell(-5)).toBe('-5');
    const csv = toCsv(
      ['a', 'b'],
      [
        ['x', 'y;z'],
        ['1', null],
      ]
    );
    expect(parseCsv(csv).rows).toEqual([
      ['a', 'b'],
      ['x', 'y;z'],
      ['1', ''],
    ]);
  });

  test('«volver» solo admite rutas internas de la flota y el borrador viaja una sola vez', () => {
    expect(fleetReturnUrl('/fleet/vehicles/new')).toBe('/fleet/vehicles/new');
    for (const bad of ['https://mal.invalid/fleet/x', '//mal.invalid', '/places', '/access', null, undefined]) {
      expect(fleetReturnUrl(bad)).toBeNull();
    }
    expect(withCreatedType('/fleet/vehicles/new', 'abc')).toBe('/fleet/vehicles/new?type=abc');
    saveDraft({ name: 'x' });
    expect(takeDraft<{ name: string }>()).toEqual({ name: 'x' });
    expect(takeDraft()).toBeNull();
  });

  test('un lote sigue aunque uno falle y un 404 cuenta como hecho', async () => {
    const { ApiError } = await import('@/lib/api-client');
    const result = await runBulk(
      ['a', 'b', 'c', 'd'],
      (x) => x,
      async (x) => {
        if (x === 'b') throw new ApiError(409, 'en uso');
        if (x === 'c') throw new ApiError(404, 'no existe');
        if (x === 'd') throw new Error('boom');
      },
      'genérico'
    );
    expect(result.done).toBe(2);
    expect(result.failed).toEqual([
      { label: 'b', message: 'en uso' },
      { label: 'd', message: 'boom' },
    ]);
  });
});

describe('tipos de vehículo', () => {
  test('el listado muestra la capacidad y borra con confirmación', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/resource-types?page=0&size=100': page([
        type(),
        type({ id: 't2', name: 'Moto', capacity: null }),
      ]),
      'DELETE /middleware/data/resource-types/t2': { status: 204 },
    });
    withToasts(<ResourceTypeList />);
    expect(await screen.findByText('Furgón')).toBeInTheDocument();
    expect(screen.getByText('500 kg · 12 m³')).toBeInTheDocument();
    expect(screen.getByText('Sin capacidad')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Moto' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('¿Eliminar tipo «Moto»? Esta acción no se puede deshacer.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(gateway.sent('DELETE', '/middleware/data/resource-types/t2')).toHaveLength(1));
  });

  test('un tipo en uso no se borra y se dice por qué', async () => {
    mockGateway({
      'GET /middleware/data/resource-types?page=0&size=100': page([type()]),
      'DELETE /middleware/data/resource-types/t1': { status: 409, body: { error: 'CONFLICT' } },
    });
    withToasts(<ResourceTypeList />);
    await screen.findByText('Furgón');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Furgón' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText(/No se puede eliminar: hay vehículos de este tipo/)).toBeInTheDocument();
  });

  test('el formulario exige lo básico, valida la capacidad y envía la capacidad codificada', async () => {
    const gateway = mockGateway({
      'POST /middleware/data/resource-types': (call: Call) => ({ ...(call.body as object), id: 'nuevo' }),
    });
    withToasts(<ResourceTypeForm id={null} returnTo="/fleet/vehicles/new" />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findAllByText('Este campo es obligatorio')).toHaveLength(2);
    expect(gateway.calls.filter((c) => c.method !== 'GET')).toHaveLength(0);

    await userEvent.type(screen.getByLabelText('Nombre'), 'Camión');
    await userEvent.type(screen.getByLabelText('Categoría'), 'truck');
    await userEvent.type(screen.getByLabelText('Peso que carga (kg)'), '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Indica un volumen mayor que 0')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Volumen (cm³)'), '5000000');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fleet/vehicles/new?type=nuevo'));
    expect(gateway.sent('POST', '/middleware/data/resource-types')[0].body).toMatchObject({
      name: 'Camión',
      category: 'truck',
      osrmProfile: 'driving',
      capacity: { weight: 1000, volume: 5_000_000 },
    });
  });
});

describe('conductores', () => {
  test('tipo y número de documento van juntos y las contraseñas deben coincidir', async () => {
    mockGateway({});
    withToasts(<DriverForm id={null} />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Luis');
    await userEvent.type(screen.getByLabelText('Apellidos'), 'Gómez');
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'no-es-correo');
    await userEvent.type(screen.getByLabelText('Número de documento'), '123');
    await userEvent.type(screen.getByLabelText('Contraseña inicial'), 'abcdefgh');
    await userEvent.type(screen.getByLabelText('Repetir contraseña'), 'otra-cosa');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Introduce un correo válido')).toBeInTheDocument();
    expect(screen.getByText('Elige el tipo de documento')).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  test('crea el conductor con rol driver y avisa si el correo ya existe', async () => {
    const gateway = mockGateway({
      'POST /middleware/data/users': { status: 409, body: { error: 'CONFLICT' } },
    });
    withToasts(<DriverForm id={null} />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Luis');
    await userEvent.type(screen.getByLabelText('Apellidos'), 'Gómez');
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'luis@example.invalid');
    await userEvent.type(screen.getByLabelText('Contraseña inicial'), 'abcdefgh');
    await userEvent.type(screen.getByLabelText('Repetir contraseña'), 'abcdefgh');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ya existe una cuenta con ese correo')).toBeInTheDocument();
    expect(gateway.sent('POST', '/middleware/data/users')[0].body).toMatchObject({
      role: 'driver',
      email: 'luis@example.invalid',
      password: 'abcdefgh',
    });
    expect(gateway.sent('POST', '/middleware/data/users')[0].body).not.toHaveProperty('identifierType');
  });

  test('editar conserva el documento que ya tenía', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/users/d1': driver({ identifierType: 'citizen_id', identifierValue: '999' }),
      'GET /middleware/data/master-domains': [],
      'PUT /middleware/data/users/d1': driver(),
    });
    withToasts(<DriverForm id="d1" />);
    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fleet/drivers'));
    expect(gateway.sent('PUT', '/middleware/data/users/d1')[0].body).toMatchObject({
      identifierType: 'citizen_id',
      identifierValue: '999',
    });
  });
});

describe('vehículos', () => {
  const vehicle = (over: Partial<Resource> = {}): Resource =>
    ({
      id: 'v1',
      name: 'Camioneta',
      licensePlate: 'ABC123',
      resourceTypeId: 't1',
      driverId: null,
      depotId: 'p1',
      shiftStartUtc: '2026-01-01T08:00:00Z',
      shiftDurationSec: 28800,
      breakDurationSec: 3600,
      quantity: 1,
      active: true,
      resourceType: { id: 't1', name: 'Furgón', capacity: null, osrmProfile: 'driving' },
      assignedUser: null,
      ...over,
    }) as Resource;

  test('muestra el conductor o «Sin conductor» y asigna uno', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/resources?page=0&size=100': page([
        vehicle(),
        vehicle({
          id: 'v2',
          name: 'Moto',
          licensePlate: null,
          driverId: 'd1',
          assignedUser: { id: 'd1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.invalid' },
        }),
      ]),
      'GET /middleware/data/users/drivers': [driver()],
      'PUT /middleware/data/resources/v1/driver/d1': vehicle({ driverId: 'd1' }),
    });
    withToasts(<ResourceList />);
    expect(await screen.findByText('Camioneta')).toBeInTheDocument();
    expect(screen.getByText('Sin conductor')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Asignar conductor al vehículo ABC123' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText('Conductor'), 'd1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Asignar' }));
    await waitFor(() => expect(gateway.sent('PUT', '/middleware/data/resources/v1/driver/d1')).toHaveLength(1));
  });
});

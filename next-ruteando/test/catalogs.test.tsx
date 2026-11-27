import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';

import { CatalogDetail } from '@/components/catalogs/catalog-detail';
import { CatalogList } from '@/components/catalogs/catalog-list';
import { ToastProvider } from '@/components/ui/toast';
import type { MasterDomain } from '@/lib/api/models';
import { keyError, sortValues, valuesText } from '@/lib/catalogs/values';
import { resetMasterDomainsCache } from '@/lib/hooks/use-master-domain';

import { mockGateway } from './gateway-mock';
import { renderWithI18n } from './render';

const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);
const value = (key: string, label: string, sortOrder: number | null, active = true) => ({
  key,
  label,
  description: null,
  sortOrder,
  active,
});
const domain = (over: Partial<MasterDomain> = {}): MasterDomain => ({
  id: 'm1',
  code: 'PlaceType',
  description: 'Tipos de lugar',
  system: true,
  values: [value('store', 'Tienda', 2), value('depot', 'Depósito', 1), value('misc', 'Otro', null, false)],
  ...over,
});

beforeEach(() => resetMasterDomainsCache());

describe('lógica', () => {
  test('ordena por orden (los sin orden al final), cuenta los activos y valida la clave', () => {
    expect(sortValues(domain().values).map((v) => v.key)).toEqual(['depot', 'store', 'misc']);
    expect(valuesText(domain(), (a, b) => `${a} de ${b}`)).toBe('2 de 3');
    expect(keyError('')).toBe('required');
    expect(keyError('a b')).toBe('spaces');
    expect(keyError(' ok ')).toBeNull();
  });
});

describe('catálogos', () => {
  test('el listado enlaza a cada catálogo con su recuento de valores activos', async () => {
    mockGateway({
      'GET /middleware/data/master-domains': [
        domain(),
        domain({ id: 'm2', code: 'Propio', system: false, values: [] }),
      ],
    });
    withToasts(<CatalogList />);
    expect(await screen.findByRole('link', { name: 'PlaceType' })).toHaveAttribute('href', '/catalogs/PlaceType');
    expect(screen.getByText('2 de 3')).toBeInTheDocument();
    expect(screen.getByText('Propio', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('2 catálogos')).toBeInTheDocument();
  });

  test('añade un valor, explica la clave repetida y valida antes de enviar', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/master-domains/PlaceType': domain(),
      'GET /middleware/data/master-domains': [],
      'POST /middleware/data/master-domains/PlaceType/values': (call) =>
        (call.body as { key: string }).key === 'dup'
          ? { status: 409, body: { error: 'CONFLICT' } }
          : domain({ values: [...domain().values, value('kiosk', 'Kiosco', 3)] }),
    });
    withToasts(<CatalogDetail code="PlaceType" />);
    expect(await screen.findByRole('heading', { name: 'PlaceType' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Añadir valor' }));
    expect(await screen.findAllByText('Este campo es obligatorio')).toHaveLength(2);
    await userEvent.type(screen.getByLabelText('Clave'), 'con espacio');
    await userEvent.type(screen.getByLabelText('Nombre'), 'X');
    await userEvent.type(screen.getByLabelText('Orden (opcional)'), 'a');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir valor' }));
    expect(await screen.findByText('La clave no puede llevar espacios')).toBeInTheDocument();
    expect(screen.getByText('Escribe un número entero de 0 en adelante')).toBeInTheDocument();
    expect(gateway.calls.filter((c) => c.method === 'POST')).toHaveLength(0);

    await userEvent.clear(screen.getByLabelText('Clave'));
    await userEvent.type(screen.getByLabelText('Clave'), 'dup');
    await userEvent.clear(screen.getByLabelText('Orden (opcional)'));
    await userEvent.click(screen.getByRole('button', { name: 'Añadir valor' }));
    expect(await screen.findByText('Ya existe un valor con esa clave en este catálogo')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Clave'));
    await userEvent.type(screen.getByLabelText('Clave'), 'kiosk');
    await userEvent.clear(screen.getByLabelText('Nombre'));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Kiosco');
    await userEvent.type(screen.getByLabelText('Orden (opcional)'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir valor' }));
    expect(await screen.findByText('Kiosco')).toBeInTheDocument();
    expect(gateway.sent('POST', '/middleware/data/master-domains/PlaceType/values').at(-1)!.body).toEqual({
      key: 'kiosk',
      label: 'Kiosco',
      sortOrder: 3,
    });
  });

  test('desactivar pide confirmar; activar es directo; el catálogo que responde el gateway se pinta', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/master-domains/PlaceType': domain(),
      'GET /middleware/data/master-domains': [],
      'PATCH /middleware/data/master-domains/PlaceType/values/store/toggle': domain({
        values: [value('depot', 'Depósito', 1), value('store', 'Tienda', 2, false), value('misc', 'Otro', null, false)],
      }),
      'PATCH /middleware/data/master-domains/PlaceType/values/misc/toggle': domain({
        values: domain().values.map((v) => ({ ...v, active: true })),
      }),
    });
    withToasts(<CatalogDetail code="PlaceType" />);
    await screen.findByText('Tienda');
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar valor store' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/dejará de ofrecerse en los selectores del sistema/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() =>
      expect(gateway.sent('PATCH', '/middleware/data/master-domains/PlaceType/values/store/toggle')).toHaveLength(1)
    );
    expect(await screen.findByRole('button', { name: 'Activar valor store' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Activar valor misc' }));
    await waitFor(() =>
      expect(gateway.sent('PATCH', '/middleware/data/master-domains/PlaceType/values/misc/toggle')).toHaveLength(1)
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('un catálogo que no existe vuelve al listado', async () => {
    mockGateway({ 'GET /middleware/data/master-domains/Nada': { status: 404, body: {} } });
    withToasts(<CatalogDetail code="Nada" />);
    expect(await screen.findByText('No se encontró el recurso solicitado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al listado' })).toHaveAttribute('href', '/catalogs');
  });
});

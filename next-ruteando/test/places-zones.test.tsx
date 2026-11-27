import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { VertexTable } from '@/components/map/vertex-table';
import { PlaceForm } from '@/components/places/place-form';
import { PlaceList } from '@/components/places/place-list';
import { ToastProvider } from '@/components/ui/toast';
import { ZoneForm } from '@/components/zones/zone-form';
import { ZoneList } from '@/components/zones/zone-list';
import type { Place, Zone } from '@/lib/api/models';
import { readGeocodeResult, readLocation, readReverseResult } from '@/lib/geocoding-contract';
import { resetMasterDomainsCache } from '@/lib/hooks/use-master-domain';
import { locationErrors, parseCoordinate, pointOf } from '@/lib/map/location-input';
import { buildZoneUpdateBody, codeError } from '@/lib/zones/zone-body';

import { type Call, mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/places' }));
// OpenLayers real necesita canvas: aquí el mapa «no carga» y se prueba el camino de los campos, que es la vía accesible
vi.mock('@/lib/map/openlayers', () => ({ loadOpenLayers: () => Promise.reject(new Error('sin mapa')) }));

const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);

const place = (over: Partial<Place> = {}): Place => ({
  id: 'p1',
  tenantId: 'x',
  name: 'Bodega norte',
  type: 'depot',
  address: 'Calle 1 # 2-3',
  location: { type: 'Point', coordinates: [-74.08, 4.61] },
  phoneNumber: null,
  contactName: null,
  zoneId: 'z9',
  active: true,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const SQUARE = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [-74.1, 4.6],
      [-74.0, 4.6],
      [-74.0, 4.7],
      [-74.1, 4.7],
      [-74.1, 4.6],
    ],
  ],
};
const zone = (over: Partial<Zone> = {}): Zone => ({
  id: 'z1',
  tenantId: 't1',
  name: 'Centro',
  code: 'CEN',
  boundary: SQUARE,
  color: '#0072B2',
  active: true,
  createdAt: '',
  updatedAt: '',
  ...over,
});

beforeEach(() => {
  Object.values(router).forEach((fn) => fn.mockClear());
  resetMasterDomainsCache();
});

describe('coordenadas y geocodificación', () => {
  test('lee números de un campo de texto y valida el rango', () => {
    expect(parseCoordinate(' 4,5 ')).toBe(4.5);
    expect(parseCoordinate('')).toBeNull();
    expect(parseCoordinate('abc')).toBeNull();
    expect(pointOf('4.6', '-74')).toEqual({ lat: 4.6, lng: -74 });
    expect(pointOf('91', '0')).toBeNull();
    const t = (k: string) => k;
    expect(locationErrors('', '200', t)).toEqual({
      lat: 'Este campo es obligatorio',
      lng: 'La longitud debe estar entre -180 y 180',
    });
    expect(locationErrors('4', '-74', t)).toEqual({});
  });

  test('interpreta la respuesta del geocodificador de forma tolerante', () => {
    expect(readLocation({ coordinates: [-74, 4.6] })).toEqual({ lat: 4.6, lng: -74 });
    expect(readLocation({ latitude: 1, longitude: 2 })).toEqual({ lat: 1, lng: 2 });
    expect(readLocation('x')).toBeNull();
    expect(
      readGeocodeResult({ location: { coordinates: [-74, 4.6] }, score: 95, formattedAddress: ' Calle 1 ' })
    ).toMatchObject({
      status: 'match',
      standardizedAddress: 'Calle 1',
      score: 0.95,
    });
    expect(readGeocodeResult({ location: { coordinates: [-74, 4.6] }, score: 0.5 }).status).toBe('mean');
    expect(readGeocodeResult({}).status).toBe('unmatch');
    expect(readReverseResult({ address: 'A', city: 'B', country: ' ' })).toEqual({
      address: 'A',
      city: 'B',
      country: null,
    });
  });

  test('el código de zona: sin espacios y de hasta 20 caracteres; el PUT conserva lo que no se edita', () => {
    expect(codeError('')).toBe('required');
    expect(codeError('a b')).toBe('spaces');
    expect(codeError('x'.repeat(21))).toBe('tooLong');
    expect(codeError('CEN-1')).toBeNull();
    const body = buildZoneUpdateBody(zone(), { name: 'Nuevo' });
    expect(body).toMatchObject({ name: 'Nuevo', code: 'CEN', active: true });
    for (const readOnly of ['id', 'tenantId', 'createdAt', 'updatedAt']) expect(body).not.toHaveProperty(readOnly);
  });
});

describe('lugares', () => {
  test('el formulario valida teléfono y ubicación y crea con el punto GeoJSON [lon, lat]', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/master-domains': [],
      'POST /middleware/data/places': (call: Call) => ({ ...(call.body as object), id: 'nuevo' }),
    });
    withToasts(<PlaceForm id={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findAllByText('Este campo es obligatorio')).toHaveLength(4); // nombre, tipo, latitud, longitud

    await userEvent.type(screen.getByLabelText('Nombre'), 'Tienda');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'store');
    await userEvent.type(screen.getByLabelText('Teléfono (opcional)'), 'abc');
    await userEvent.type(screen.getByLabelText('Latitud'), '95');
    await userEvent.type(screen.getByLabelText('Longitud'), '-74.08');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('La latitud debe estar entre -90 y 90')).toBeInTheDocument();
    expect(screen.getByText(/Escribe un teléfono válido/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Teléfono (opcional)'));
    await userEvent.clear(screen.getByLabelText('Latitud'));
    await userEvent.type(screen.getByLabelText('Latitud'), '4.61');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/places'));
    const body = gateway.sent('POST', '/middleware/data/places')[0]!.body;
    expect(body).toMatchObject({
      name: 'Tienda',
      type: 'store',
      location: { type: 'Point', coordinates: [-74.08, 4.61] },
    });
    expect(body).not.toHaveProperty('address');
  });

  test('editar reenvía la zona que el formulario no toca', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/places/p1': place(),
      'GET /middleware/data/master-domains': [],
      'PUT /middleware/data/places/p1': place(),
    });
    withToasts(<PlaceForm id="p1" />);
    expect(await screen.findByDisplayValue('Bodega norte')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo')).toHaveValue('depot');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/places'));
    expect(gateway.sent('PUT', '/middleware/data/places/p1')[0]!.body).toMatchObject({
      zoneId: 'z9',
      address: 'Calle 1 # 2-3',
    });
  });

  test('«Ubicar la dirección» rellena el punto y «Tomar la dirección» rellena la dirección', async () => {
    mockGateway({
      'GET /middleware/data/master-domains': [],
      'POST /middleware/data/geocoding': {
        location: { type: 'Point', coordinates: [-74.07, 4.65] },
        score: 1,
        standardizedAddress: 'CALLE 10',
      },
      'POST /middleware/data/reverse-geocoding': { address: 'Carrera 7', city: 'Bogotá' },
    });
    withToasts(<PlaceForm id={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar la dirección en el mapa' }));
    expect(await screen.findByText('Escribe primero la dirección')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Dirección (opcional)'), 'Calle 10');
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar la dirección en el mapa' }));
    await waitFor(() => expect(screen.getByLabelText('Latitud')).toHaveValue(4.65));
    expect(screen.getByLabelText('Longitud')).toHaveValue(-74.07);
    expect(screen.getByText(/Dirección ubicada como «CALLE 10»/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Dirección (opcional)'));
    await userEvent.click(screen.getByRole('button', { name: 'Tomar la dirección del punto' }));
    await waitFor(() => expect(screen.getByLabelText('Dirección (opcional)')).toHaveValue('Carrera 7'));
  });

  test('una dirección que no se encuentra no mueve el punto y lo dice', async () => {
    mockGateway({
      'GET /middleware/data/master-domains': [],
      'POST /middleware/data/geocoding': { status: 404, body: {} },
    });
    withToasts(<PlaceForm id={null} />);
    await userEvent.type(screen.getByLabelText('Dirección (opcional)'), 'nunca');
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar la dirección en el mapa' }));
    expect(await screen.findByText(/No se encontró la dirección/)).toBeInTheDocument();
    expect(screen.getByLabelText('Latitud')).toHaveValue(null);
  });

  test('el listado filtra por tipo con chips y avisa si el mapa no carga', async () => {
    mockGateway({
      'GET /middleware/data/places?page=0&size=100': page([
        place(),
        place({ id: 'p2', name: 'Tienda sur', type: 'store' }),
        place({ id: 'p3', name: 'Rara', type: 'kiosco' }),
      ]),
    });
    withToasts(<PlaceList />);
    expect(await screen.findByText('Bodega norte')).toBeInTheDocument();
    const chips = screen.getByRole('group', { name: 'Tipo' });
    expect(within(chips).getByRole('button', { name: /Kiosco|kiosco/ })).toBeInTheDocument();
    await userEvent.click(within(chips).getByRole('button', { name: /Tienda/ }));
    expect(screen.queryByText('Bodega norte')).toBeNull();
    expect(screen.getByText('Tienda sur')).toBeInTheDocument();
    expect(await screen.findByText(/No se pudo cargar el mapa/)).toBeInTheDocument();
  });
});

describe('zonas', () => {
  test('el listado lee un arreglo con el tenantId y explica por qué no se borra una zona en uso', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/zones?tenantId=t1': [zone(), zone({ id: 'z2', name: 'Norte', code: 'NOR', color: null })],
      'DELETE /middleware/data/zones/z1?tenantId=t1': { status: 409, body: { error: 'CONFLICT' } },
    });
    withToasts(<ZoneList tenantId="t1" />);
    expect(await screen.findByText('Centro')).toBeInTheDocument();
    expect(screen.getByText('Azul')).toBeInTheDocument();
    expect(screen.getByText('Sin color')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Centro' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText(/la zona se usa en lugares, paquetes o configuraciones/)).toBeInTheDocument();
    expect(gateway.sent('DELETE', '/middleware/data/zones/z1?tenantId=t1')).toHaveLength(1);
  });

  test('sin polígono válido no se envía; con tres vértices crea la zona con el anillo cerrado y antihorario', async () => {
    const gateway = mockGateway({
      'POST /middleware/data/zones?tenantId=t1': (call: Call) => ({ ...(call.body as object), id: 'nueva' }),
    });
    withToasts(<ZoneForm id={null} tenantId="t1" />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Sur');
    await userEvent.type(screen.getByLabelText('Código'), 'con espacio');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El código no puede llevar espacios')).toBeInTheDocument();
    expect(screen.getByText('Dibuja el polígono de la zona en el mapa o escribe sus vértices')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Código'));
    await userEvent.type(screen.getByLabelText('Código'), 'SUR');
    // Tres vértices en sentido horario: el anillo enviado debe ir antihorario y cerrado
    const corners: [string, string][] = [
      ['4.6', '-74.1'],
      ['4.7', '-74.1'],
      ['4.6', '-74.0'],
    ];
    for (const [i, [lat, lng]] of corners.entries()) {
      await userEvent.click(screen.getByRole('button', { name: 'Añadir vértice' }));
      // el vértice nuevo nace con valores a medio camino: se reemplazan
      await userEvent.clear(screen.getByLabelText(`Latitud del vértice ${i + 1}`));
      await userEvent.type(screen.getByLabelText(`Latitud del vértice ${i + 1}`), lat);
      await userEvent.clear(screen.getByLabelText(`Longitud del vértice ${i + 1}`));
      await userEvent.type(screen.getByLabelText(`Longitud del vértice ${i + 1}`), lng);
    }
    expect(await screen.findByText(/Polígono válido: 3 vértices/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Verde' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/zones'));
    const body = gateway.sent('POST', '/middleware/data/zones?tenantId=t1')[0]!.body as Zone;
    expect(body).toMatchObject({ name: 'Sur', code: 'SUR', color: '#009E73' });
    const ring = body.boundary.coordinates[0]!;
    expect(ring).toHaveLength(4);
    expect(ring[0]).toEqual(ring[3]);
  });

  test('un polígono que se cruza no se envía y se explica', async () => {
    mockGateway({});
    withToasts(<ZoneForm id={null} tenantId="t1" />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Lazo');
    await userEvent.type(screen.getByLabelText('Código'), 'LZ');
    // Pajarita: los lados 1 y 3 se cruzan
    const bow: [string, string][] = [
      ['0', '0'],
      ['1', '1'],
      ['1', '0'],
      ['0', '1'],
    ];
    for (const [i, [lat, lng]] of bow.entries()) {
      await userEvent.click(screen.getByRole('button', { name: 'Añadir vértice' }));
      // el vértice nuevo nace con valores a medio camino: se reemplazan
      await userEvent.clear(screen.getByLabelText(`Latitud del vértice ${i + 1}`));
      await userEvent.type(screen.getByLabelText(`Latitud del vértice ${i + 1}`), lat);
      await userEvent.clear(screen.getByLabelText(`Longitud del vértice ${i + 1}`));
      await userEvent.type(screen.getByLabelText(`Longitud del vértice ${i + 1}`), lng);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findAllByText(/Los lados 1 y 3 se cruzan/)).not.toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  test('editar carga el polígono y conserva `active` al guardar', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/zones/z1?tenantId=t1': zone({ active: false }),
      'PUT /middleware/data/zones/z1?tenantId=t1': zone(),
    });
    withToasts(<ZoneForm id="z1" tenantId="t1" />);
    expect(await screen.findByDisplayValue('Centro')).toBeInTheDocument();
    expect(screen.getByText(/Polígono válido: 4 vértices/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/zones'));
    expect(gateway.sent('PUT', '/middleware/data/zones/z1?tenantId=t1')[0]!.body).toMatchObject({
      active: false,
      code: 'CEN',
    });
  });
});

describe('tabla de vértices', () => {
  test('un valor inválido no cambia la lista y lo que llega de fuera reconstruye la tabla', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<VertexTable vertices={[{ lat: 1, lng: 2 }]} onChange={onChange} />);
    // sin proveedor de idioma `t` devuelve la clave (español): suficiente para la prueba
    const lat = screen.getByLabelText('Latitud del vértice 1');
    await userEvent.clear(lat);
    expect(screen.getByText('Obligatorio')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.type(lat, '95');
    expect(screen.getByText('Entre -90 y 90')).toBeInTheDocument();
    await userEvent.clear(lat);
    await userEvent.type(lat, '5');
    expect(onChange).toHaveBeenLastCalledWith([{ lat: 5, lng: 2 }]);

    rerender(
      <VertexTable
        vertices={[
          { lat: 9, lng: 9 },
          { lat: 8, lng: 8 },
        ]}
        onChange={onChange}
      />
    );
    expect(screen.getByLabelText('Latitud del vértice 2')).toHaveValue(8);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar el vértice 1' }));
    expect(onChange).toHaveBeenLastCalledWith([{ lat: 8, lng: 8 }]);
  });
});

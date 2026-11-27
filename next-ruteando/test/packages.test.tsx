import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PackageForm } from '@/components/packages/package-form';
import { PackageImport } from '@/components/packages/package-import';
import { PackageList } from '@/components/packages/package-list';
import { ToastProvider } from '@/components/ui/toast';
import type { GeocodeResult, Package } from '@/lib/api/models';
import { ApiError } from '@/lib/api-client';
import { parseCsv } from '@/lib/csv';
import { resetMasterDomainsCache } from '@/lib/hooks/use-master-domain';
import { packagesToCsv } from '@/lib/packages/export';
import { runImport } from '@/lib/packages/importer';
import {
  applyGeocode,
  importableRows,
  locateRows,
  needsLocating,
  reviewCounts,
  reviewCsv,
  type ReviewRow,
  startReview,
} from '@/lib/packages/locating';
import { buildUpdateBody } from '@/lib/packages/package-body';
import { importErrorsCsv, packageTemplateCsv, validateRows } from '@/lib/packages/rows';

import { type Call, mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/packages' }));
vi.mock('@/lib/map/openlayers', () => ({ loadOpenLayers: () => Promise.reject(new Error('sin mapa')) }));

const t = (key: string, args: readonly (string | number)[] = []) =>
  args.reduce<string>((text, a, i) => text.replace(`{${i}}`, String(a)), key);
const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);

const pkg = (over: Partial<Package> = {}): Package =>
  ({
    id: 'k1',
    guideNumber: 'G-1',
    name: 'Paquete de Ana',
    serviceType: 'delivery',
    address: 'Calle 1',
    standardizedAddress: 'CALLE 1',
    location: { type: 'Point', coordinates: [-74.08, 4.6] },
    geocodingScore: 0.9,
    geocodingStatus: 'match',
    city: 'Bogotá',
    country: null,
    postalCode: null,
    zoneId: null,
    weight: 2,
    volume: 1,
    pieceNumber: 1,
    observation: null,
    status: 'pending',
    createdAt: '',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  }) as Package;

const csv = (...lines: string[]) => parseCsv(lines.join('\n'));

beforeEach(() => {
  Object.values(router).forEach((fn) => fn.mockClear());
  resetMasterDomainsCache();
});

describe('validación del archivo', () => {
  test('solo la dirección es obligatoria y sin coordenadas la fila queda por ubicar', () => {
    const result = validateRows(csv('DIRECCION', 'Calle 1 # 2-3'), t);
    expect(result.errors).toEqual([]);
    expect(result.valid[0]!.input).toMatchObject({
      name: 'Calle 1 # 2-3',
      serviceType: 'delivery',
      weight: 0,
      volume: 0,
      location: null,
    });
  });

  test('reconoce la cabecera exportada, los alias y los tres idiomas del servicio', () => {
    const result = validateRows(
      csv(
        'ID_GUIA;DIRECCION;LONGITUD;LATITUD;SERVICIO;PIEZAS',
        'G1;Calle 1;-74,08;4,61;Recolha;3',
        'G2;Calle 2;-74.1;4.7;pickup;1'
      ),
      t
    );
    expect(result.errors).toEqual([]);
    expect(result.valid[0]!.input).toMatchObject({
      guideNumber: 'G1',
      serviceType: 'pickup',
      pieceNumber: 3,
      location: { type: 'Point', coordinates: [-74.08, 4.61] },
    });
  });

  test('señala cada problema con su línea y campo: coordenadas a medias, rango, números, guía repetida', () => {
    const result = validateRows(
      csv(
        'ID_GUIA;DIRECCION;LONGITUD;LATITUD;PESO;PIEZAS;SERVICIO',
        'A;;;;;;', // sin dirección
        'B;Calle;-74;;;;', // solo una coordenada
        'C;Calle;300;4;;;', // fuera de rango
        'D;Calle;;;-1;0;volando', // peso, piezas y servicio
        'D;Calle;;;;;' // guía repetida
      ),
      t
    );
    const by = (line: number) => result.errors.filter((e) => e.line === line).map((e) => e.field);
    expect(by(2)).toEqual(['DIRECCION']);
    expect(by(3)).toEqual(['LATITUD']);
    expect(by(4)).toEqual(['LONGITUD']);
    expect(by(5).sort()).toEqual(['PESO', 'PIEZAS', 'SERVICIO']);
    expect(result.errors.find((e) => e.line === 6)?.message).toBe('La guía «D» ya aparece en la línea 5');
    expect(result.valid).toHaveLength(0);
  });

  test('sin la columna obligatoria no se valida ninguna fila; las desconocidas se ignoran', () => {
    expect(validateRows(csv('NOMBRE', 'x'), t).missingColumns).toEqual(['DIRECCION']);
    expect(validateRows(csv('DIRECCION;COLOR', 'x;rojo'), t).ignoredColumns).toEqual(['COLOR']);
  });

  test('la plantilla y el informe protegen las celdas contra fórmulas', () => {
    expect(packageTemplateCsv(t)).toContain('ID_GUIA;NOMBRE;SERVICIO;DIRECCION');
    expect(packageTemplateCsv(t)).toContain('-74.07728'); // número, no texto protegido
    const report = importErrorsCsv([{ line: 2, field: 'X', message: '=cmd', original: ['=1+1', 'b'] }], t);
    expect(report).toContain("'=cmd");
    expect(report).toContain("'=1+1 | b");
  });

  test('el CSV de paquetes exporta la cabecera de la plantilla y el estado', () => {
    const out = packagesToCsv([pkg()], t);
    expect(out.split('\r\n')[0]).toContain('ID_GUIA;LONGITUD;LATITUD');
    expect(out).toContain('G-1;-74.08;4.6;Bogotá;;Calle 1;CALLE 1;0.9;Ubicada;Pendiente');
  });

  test('el PUT conserva lo que la pantalla no edita y quita lo que el gateway calcula', () => {
    const body = buildUpdateBody(pkg({ measure: { w: 1 } } as Partial<Package>), { name: 'Nuevo' });
    expect(body).toMatchObject({ name: 'Nuevo', measure: { w: 1 }, guideNumber: 'G-1' });
    for (const gone of ['id', 'status', 'standardizedAddress', 'geocodingScore', 'geocodingStatus', 'createdAt']) {
      expect(body).not.toHaveProperty(gone);
    }
  });
});

describe('importación', () => {
  const row = (line: number, guide?: string) => ({
    line,
    original: [],
    input: {
      name: 'n',
      serviceType: 'delivery',
      address: 'a',
      weight: 0,
      volume: 0,
      location: { type: 'Point' as const, coordinates: [0, 0] as [number, number] },
      ...(guide ? { guideNumber: guide } : {}),
    },
  });

  test('una guía repetida cuenta como «ya existía» y un fallo no detiene a las demás', async () => {
    const results = await runImport(
      [row(1, 'G1'), row(2), row(3, 'G3')],
      async (input) => {
        if (input.guideNumber === 'G1') throw new ApiError(409, 'dup');
        if (input.name === 'n' && !input.guideNumber) throw new ApiError(400, 'mala');
      },
      { t, sleep: async () => {} }
    );
    expect(results.map((r) => r.status)).toEqual(['existed', 'failed', 'created']);
    expect(results[1]!.message).toBe('mala');
  });

  test('ante saturación (429) reintenta con espera creciente y baja la concurrencia', async () => {
    const waits: number[] = [];
    let attempts = 0;
    const results = await runImport(
      [row(1)],
      async () => {
        if (++attempts < 3) throw new ApiError(429, 'saturado');
      },
      { t, baseDelayMs: 100, sleep: async (ms) => void waits.push(ms) }
    );
    expect(results[0]!.status).toBe('created');
    expect(waits).toEqual([100, 200]);
    // agotados los intentos, falla
    const failed = await runImport(
      [row(1)],
      async () => {
        throw new ApiError(503, 'caído');
      },
      { t, maxAttempts: 2, sleep: async () => {} }
    );
    expect(failed[0]!.status).toBe('failed');
  });

  test('cancelar no lanza filas nuevas: el resto queda «sin procesar»', async () => {
    let cancelled = false;
    const results = await runImport(
      [row(1), row(2), row(3)],
      async () => {
        cancelled = true;
      },
      { t, concurrency: 1, isCancelled: () => cancelled }
    );
    expect(results.map((r) => r.status)).toEqual(['created', 'skipped', 'skipped']);
    expect(await runImport([], async () => {}, { t })).toEqual([]);
  });

  test('ubicar: las filas con coordenadas son «manual», las demás se ubican y un fallo del servicio no detiene a las otras', async () => {
    const rows = startReview(validateRows(csv('DIRECCION;LONGITUD;LATITUD', 'A;-74;4', 'B;;', 'C;;', 'D;;'), t).valid);
    expect(rows.map((r) => r.status)).toEqual(['manual', 'unmatch', 'unmatch', 'unmatch']);
    const seen: ReviewRow[] = [];
    await locateRows(
      rows,
      async ({ address }): Promise<GeocodeResult> => {
        if (address === 'C') throw new Error('red');
        if (address === 'D') return { status: 'unmatch', standardizedAddress: null, location: null, score: null };
        return { status: 'mean', standardizedAddress: 'B BIS', location: { lat: 4.5, lng: -74.1 }, score: 0.6 };
      },
      (r) => seen.push(r)
    );
    expect(seen.map((r) => [r.input.address, r.status, r.failed])).toEqual(
      expect.arrayContaining([
        ['B', 'mean', false],
        ['C', 'unmatch', true],
        ['D', 'unmatch', false],
      ])
    );
    const merged = rows.map((r) => seen.find((s) => s.line === r.line) ?? r);
    expect(reviewCounts(merged)).toEqual({ all: 4, match: 0, mean: 1, manual: 1, unmatch: 2, failed: 1 });
    expect(importableRows(merged)).toHaveLength(2); // las no ubicadas no se importan
    expect(merged.filter(needsLocating)).toHaveLength(2);
    expect(reviewCsv(merged).split('\r\n')[2]).toContain('B BIS;0.6;mean');
  });

  test('cancelar la ubicación no entrega las filas que quedaban', async () => {
    const rows = startReview(validateRows(csv('DIRECCION', 'A', 'B', 'C'), t).valid);
    const controller = new AbortController();
    const seen: ReviewRow[] = [];
    await locateRows(
      rows,
      async () => {
        controller.abort();
        return { status: 'match', standardizedAddress: null, location: { lat: 1, lng: 2 }, score: 1 };
      },
      (r) => seen.push(r),
      controller.signal,
      1
    );
    expect(seen).toHaveLength(0);
    expect(
      applyGeocode(rows[0]!, { status: 'unmatch', standardizedAddress: 'x', location: { lat: 1, lng: 1 }, score: 0 })
        .input.location
    ).toBeNull();
  });
});

const file = (name: string, text: string) => new File([text], name, { type: 'text/csv' });

describe('pantalla de importación', () => {
  test('rechaza lo que no es CSV, está vacío o no tiene la columna obligatoria', async () => {
    mockGateway({});
    renderWithI18n(<PackageImport />);
    const input = screen.getByLabelText('Archivo CSV');
    await userEvent.upload(input, file('x.txt', 'a'), { applyAccept: false });
    expect(await screen.findByText('El archivo debe ser un CSV (extensión .csv).')).toBeInTheDocument();
    await userEvent.upload(input, file('x.csv', ''), { applyAccept: false });
    expect(await screen.findByText('El archivo está vacío.')).toBeInTheDocument();
    await userEvent.upload(input, file('x.csv', 'NOMBRE\nana'), { applyAccept: false });
    expect(await screen.findByText(/Faltan columnas obligatorias: DIRECCION/)).toBeInTheDocument();
  });

  test('con coordenadas importa directo: crea cada paquete y cuenta el resultado', async () => {
    const gateway = mockGateway({
      'POST /middleware/data/packages': (call: Call) => ({ ...(call.body as object), id: 'n' }),
    });
    renderWithI18n(<PackageImport />);
    await userEvent.upload(
      screen.getByLabelText('Archivo CSV'),
      file('p.csv', 'ID_GUIA;DIRECCION;LONGITUD;LATITUD\nG1;Calle 1;-74;4\nG2;Calle 2;-74.1;4.1\nG3;;;'),
      { applyAccept: false }
    );
    expect(await screen.findByText('3 filas leídas: 2 válidas y 1 rechazadas.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Importar 2 paquetes' }));
    expect(
      await screen.findByText(/Importación terminada: 2 creados, 0 ya existían, 0 fallidos y 0 sin procesar/)
    ).toBeInTheDocument();
    expect(gateway.sent('POST', '/middleware/data/packages')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Ver los paquetes' })).toHaveAttribute('href', '/packages');
  });

  test('sin coordenadas ubica las direcciones y deja revisar antes de importar', async () => {
    const gateway = mockGateway({
      'POST /middleware/data/geocoding': { location: { type: 'Point', coordinates: [-74.07, 4.65] }, score: 1 },
      'POST /middleware/data/packages': { id: 'n' },
    });
    renderWithI18n(<PackageImport />);
    await userEvent.upload(screen.getByLabelText('Archivo CSV'), file('p.csv', 'DIRECCION\nCalle 1\nCalle 2'), {
      applyAccept: false,
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Ubicar direcciones y revisar' }));
    expect(
      await screen.findByText('2 filas: 2 ubicadas, 0 aproximadas, 0 manuales y 0 sin ubicar.')
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Importar 2 paquetes' }));
    expect(await screen.findByText(/2 creados/)).toBeInTheDocument();
    expect(gateway.sent('POST', '/middleware/data/geocoding')).toHaveLength(2);
    expect(gateway.sent('POST', '/middleware/data/packages')[0]!.body).toMatchObject({
      location: { type: 'Point', coordinates: [-74.07, 4.65] },
    });
  });
});

describe('paquetes', () => {
  test('el formulario valida lo básico y crea sin enviar lo vacío', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/master-domains': [],
      'POST /middleware/data/packages': (call: Call) => ({ ...(call.body as object), id: 'n' }),
    });
    withToasts(<PackageForm id={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect((await screen.findAllByText('Este campo es obligatorio')).length).toBeGreaterThanOrEqual(6);

    await userEvent.type(screen.getByLabelText('Nombre'), 'Caja');
    await userEvent.selectOptions(screen.getByLabelText('Tipo de servicio'), 'pickup');
    await userEvent.type(screen.getByLabelText('Dirección'), 'Calle 9');
    await userEvent.type(screen.getByLabelText('Peso'), '-1');
    await userEvent.type(screen.getByLabelText('Volumen'), '0.5');
    await userEvent.clear(screen.getByLabelText('Número de piezas'));
    await userEvent.type(screen.getByLabelText('Número de piezas'), '1.5');
    await userEvent.type(screen.getByLabelText('Latitud'), '4.6');
    await userEvent.type(screen.getByLabelText('Longitud'), '-74.08');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El valor no puede ser negativo')).toBeInTheDocument();
    expect(screen.getByText('Escribe un número entero de 1 o más')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Peso'));
    await userEvent.type(screen.getByLabelText('Peso'), '3');
    await userEvent.clear(screen.getByLabelText('Número de piezas'));
    await userEvent.type(screen.getByLabelText('Número de piezas'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/packages'));
    const body = gateway.sent('POST', '/middleware/data/packages')[0]!.body;
    expect(body).toMatchObject({ name: 'Caja', serviceType: 'pickup', weight: 3, volume: 0.5 });
    for (const empty of ['guideNumber', 'city', 'observation', 'pieceNumber']) expect(body).not.toHaveProperty(empty);
  });

  test('una guía repetida se explica', async () => {
    mockGateway({
      'GET /middleware/data/master-domains': [],
      'POST /middleware/data/packages': { status: 409, body: { error: 'CONFLICT' } },
    });
    withToasts(<PackageForm id={null} />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Caja');
    await userEvent.selectOptions(screen.getByLabelText('Tipo de servicio'), 'delivery');
    await userEvent.type(screen.getByLabelText('Dirección'), 'Calle 9');
    await userEvent.type(screen.getByLabelText('Peso'), '1');
    await userEvent.type(screen.getByLabelText('Volumen'), '1');
    await userEvent.type(screen.getByLabelText('Latitud'), '4.6');
    await userEvent.type(screen.getByLabelText('Longitud'), '-74.08');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ya existe un paquete con ese número de guía')).toBeInTheDocument();
  });

  test('el listado cuenta por estado y cambia el estado de uno; cancelar pide confirmar', async () => {
    const gateway = mockGateway({
      'GET /middleware/data/packages?page=0&size=100': page([
        pkg(),
        pkg({ id: 'k2', guideNumber: 'G-2', name: 'Otro', status: 'attended' }),
      ]),
      'GET /middleware/data/master-domains': [],
      'PATCH /middleware/data/packages/k1/status/cancelled': pkg({ status: 'cancelled' }),
      'PATCH /middleware/data/packages/k1/status/attended': pkg({ status: 'attended' }),
    });
    withToasts(<PackageList />);
    expect(await screen.findByText('Paquete de Ana')).toBeInTheDocument();
    const chips = screen.getByRole('group', { name: 'Estado' });
    expect(within(chips).getByRole('button', { name: /Pendiente 1/ })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: /Atendido 1/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar el estado del paquete G-1' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cancelado' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('¿Cancelar el paquete «G-1»?')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar paquete' }));
    await waitFor(() => expect(gateway.sent('PATCH', '/middleware/data/packages/k1/status/cancelled')).toHaveLength(1));
  });
});

import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { AuditScreen } from '@/components/audit/audit-screen';
import { ToastProvider } from '@/components/ui/toast';
import type { AuditLog } from '@/lib/api/models';
import { diffChanges, hasValueChanges } from '@/lib/audit/diff';
import { auditCsvFileName, auditToCsv } from '@/lib/audit/export';
import {
  applyAuditFilters,
  EMPTY_FILTERS,
  EMPTY_QUERY,
  NO_PERSON,
  parseAuditQuery,
  parseDay,
  rangeBounds,
  toQueryParams,
} from '@/lib/audit/filters';
import {
  actorInitials,
  auditActionLabel,
  auditActor,
  auditKind,
  auditSummary,
  breakableParts,
  humanizeIds,
  isDeletion,
  shortId,
} from '@/lib/audit/labels';
import { entityTarget } from '@/lib/audit/links';
import { resolveScope, scopesFor } from '@/lib/audit/scopes';
import { activityByDay, kindShares, summarize } from '@/lib/audit/stats';

import { mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

// La dirección de la página: `useSearchParams` sigue al historial real (la pantalla lo escribe con pushState/replaceState)
const URL_EVENT = 'test-url-change';
vi.mock('next/navigation', () => ({
  usePathname: () => '/audit',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (notify) => {
        window.addEventListener(URL_EVENT, notify);
        return () => window.removeEventListener(URL_EVENT, notify);
      },
      () => window.location.search
    );
    return new URLSearchParams(search);
  },
}));
vi.mock('@/lib/map/openlayers', () => ({ loadOpenLayers: () => Promise.reject(new Error('sin mapa')) }));

const t = (key: string, args: readonly (string | number)[] = []) =>
  args.reduce<string>((text, a, i) => text.replace(`{${i}}`, String(a)), key);
const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);

const NOW = Date.parse('2026-03-10T15:00:00');
const event = (id: string, over: Partial<AuditLog> = {}): AuditLog => ({
  id,
  action: 'package.updated',
  entityType: 'package',
  entityId: 'aaaaaaaaaaaaaaaaaaaaaaa1',
  description: null,
  actorEmail: 'ana.martinez@example.invalid',
  actorRole: 'TENANT_ADMIN',
  changes: null,
  createdAt: '2026-03-10T12:00:00',
  ...over,
});

describe('etiquetas', () => {
  test('el tipo sale del último verbo conocido y los estados ganan', () => {
    expect(auditKind('package.status.change')).toBe('estado');
    expect(auditKind('journey.deleted')).toBe('eliminacion');
    expect(auditKind('resource.assign.driver')).toBe('asignacion');
    expect(auditKind('notification.push_registered')).toBe('otras');
    expect(isDeletion('journey.deleted')).toBe(true);
    expect(isDeletion('invitation.revoked')).toBe(false);
  });

  test('la frase concuerda el participio y cae a la clave si no sabe componerla', () => {
    expect(auditActionLabel('journey.deleted', t)).toBe('Jornada eliminada');
    expect(auditActionLabel('package.created', t)).toBe('Paquete creado');
    expect(auditActionLabel('package.status.change', t)).toBe('Estado de paquete cambiado');
    expect(auditActionLabel('algo.raro', t)).toBe('algo.raro');
    expect(auditSummary({ action: 'package.created', description: 'package.created' }, t)).toBe('Paquete creado');
    expect(auditSummary({ action: 'package.created', description: ' Creó el paquete X ' }, t)).toBe(
      'Creó el paquete X'
    );
    expect(humanizeIds('Driver 6acb99b1a2fa810fb39fb5a9 asignado')).toBe(
      'Driver #fb5a9 asignado'.replace('#fb5a9', '#9fb5a9'.slice(-6) === '9fb5a9' ? '#9fb5a9' : '#fb5a9')
    );
  });

  test('quién actuó, con rol normalizado, anónimo y sin identificar', () => {
    expect(auditActor({ actorEmail: 'a@b.c', actorRole: 'TENANT_ADMIN' }, t)).toEqual({
      person: 'a@b.c',
      role: 'Administrador',
      identified: true,
    });
    expect(auditActor({ actorEmail: null, actorRole: null }, t)).toEqual({
      person: 'Sin identificar',
      role: null,
      identified: false,
    });
    expect(auditActor({ actorEmail: null, actorRole: 'anonymous' }, t)).toEqual({
      person: 'Anónimo',
      role: null,
      identified: false,
    });
    expect(actorInitials('ana.martinez@x.y')).toBe('AM');
    expect(actorInitials('luis')).toBe('LU');
    expect(actorInitials('')).toBe('');
    expect(breakableParts('ana.martinez@x.com').join('')).toBe('ana.martinez@x.com');
    expect(shortId('1234567890')).toBe('34567890');
  });

  test('los ámbitos dependen del rol y uno que no toca se cambia por el más amplio', () => {
    expect(scopesFor('tenant_admin')).toEqual(['empresa', 'mia']);
    expect(scopesFor('super_admin')).toEqual(['todas', 'mia']);
    expect(scopesFor('agent')).toEqual(['mia']);
    expect(resolveScope('agent', 'todas')).toBe('mia');
    expect(resolveScope('super_admin', 'mia')).toBe('mia');
    expect(resolveScope(null, null)).toBe('mia');
  });

  test('el enlace a la entidad respeta el rol y las eliminaciones', () => {
    const log = { action: 'place.updated', entityType: 'place', entityId: 'p1' };
    expect(entityTarget(log, 'tenant_admin', t)).toEqual({ href: '/places/p1', label: 'Abrir lugar' });
    expect(entityTarget(log, 'agent', t)).toBeNull();
    expect(entityTarget({ ...log, action: 'place.deleted' }, 'tenant_admin', t)).toBeNull();
    expect(entityTarget({ ...log, entityType: 'user' }, 'tenant_admin', t)).toBeNull();
    expect(entityTarget({ action: 'package.created', entityType: 'package', entityId: 'k' }, 'agent', t)?.href).toBe(
      '/packages/k'
    );
  });
});

describe('cambios y exportación', () => {
  test('los cambiados van primero y vacío y null cuentan igual', () => {
    const rows = diffChanges(
      { before: { name: 'A', phone: '', status: 'pending' }, after: { name: 'B', phone: null, status: 'attended' } },
      t,
      'package'
    );
    expect(rows.map((r) => [r.field, r.changed])).toEqual([
      ['name', true],
      ['status', true],
      ['phone', false],
    ]);
    expect(rows.find((r) => r.field === 'status')).toMatchObject({
      before: 'Pendiente',
      after: 'Atendido',
      label: 'Estado',
    });
    expect(rows.find((r) => r.field === 'phone')).toMatchObject({
      before: '(vacío)',
      after: '(vacío)',
      beforeEmpty: true,
    });
    expect(hasValueChanges({ before: { a: 1 }, after: { a: 1 } })).toBe(false);
    expect(hasValueChanges(null)).toBe(false);
  });

  test('el CSV lleva claves, cambios y la IP solo si algún evento la trae, y protege las fórmulas', () => {
    const rows = [event('e1', { changes: { before: { name: 'A' }, after: { name: 'B' } }, description: '=cmd' })];
    const csv = auditToCsv(rows, t);
    expect(csv.split('\r\n')[0]).not.toContain('IP');
    expect(csv).toContain("'=cmd");
    expect(csv).toContain('Nombre: A → B');
    expect(csv).toContain('Paquete actualizado (package.updated)');
    expect(auditToCsv([{ ...rows[0]!, ipAddress: '10.0.0.1' }], t).split('\r\n')[0]).toContain('IP');
    expect(auditCsvFileName(new Date(2026, 0, 5))).toBe('auditoria-2026-01-05.csv');
  });
});

describe('filtros y dirección', () => {
  test('la dirección se lee con tolerancia y se escribe sin lo que vale su valor por defecto', () => {
    const q = parseAuditQuery(
      new URLSearchParams(
        'ambito=empresa&accion=creacion&persona=a@b.c&rango=7d&cambios=1&id=ab12&q=hola&entidad=package&evento=e1&empresa=t_1'
      )
    );
    expect(q).toMatchObject({
      scope: 'empresa',
      kind: 'creacion',
      person: 'a@b.c',
      range: '7d',
      onlyChanges: true,
      entityId: 'ab12',
      text: 'hola',
      entity: 'package',
      event: 'e1',
      tenant: 't_1',
    });
    // lo inválido se ignora
    expect(
      parseAuditQuery(new URLSearchParams('ambito=x&accion=zzz&rango=1y&desde=2026-02-31&id=../x&evento=<s>'))
    ).toMatchObject({
      scope: null,
      kind: null,
      range: 'todo',
      from: null,
      entityId: null,
      event: null,
    });
    expect(parseAuditQuery(new URLSearchParams('desde=2026-01-01'))).toMatchObject({
      range: 'personalizado',
      from: '2026-01-01',
      to: null,
    });
    expect(toQueryParams({ ...EMPTY_QUERY, range: 'todo' })).toMatchObject({ rango: null, desde: null, cambios: null });
    expect(toQueryParams({ ...EMPTY_QUERY, range: '30d', onlyChanges: true })).toMatchObject({
      rango: '30d',
      cambios: '1',
    });
    expect(parseDay('2026-02-31')).toBeNull();
  });

  test('los filtros se combinan con «y»: rango, tipo, persona (o sin correo), cambios y entidad', () => {
    const rows = [
      event('e1'),
      event('e2', { action: 'package.deleted', createdAt: '2026-03-01T12:00:00' }),
      event('e3', { actorEmail: null, changes: { before: { a: 1 }, after: { a: 2 } } }),
      event('e4', { entityId: 'zzz', createdAt: 'no es fecha' }),
    ];
    const ids = (f: Partial<typeof EMPTY_FILTERS>) =>
      applyAuditFilters(rows, { ...EMPTY_FILTERS, ...f }, NOW).map((r) => r.id);
    expect(ids({})).toEqual(['e1', 'e2', 'e3', 'e4']);
    expect(ids({ range: '24h' })).toEqual(['e1', 'e3']);
    expect(ids({ range: '7d' })).toEqual(['e1', 'e3']);
    expect(ids({ range: 'personalizado', from: '2026-03-01', to: '2026-03-01' })).toEqual(['e2']);
    expect(ids({ kind: 'eliminacion' })).toEqual(['e2']);
    expect(ids({ person: NO_PERSON })).toEqual(['e3']);
    expect(ids({ person: 'ANA.martinez@example.invalid' })).toEqual(['e1', 'e2', 'e4']);
    expect(ids({ onlyChanges: true })).toEqual(['e3']);
    expect(ids({ entityId: 'zzz' })).toEqual(['e4']);
    expect(rangeBounds({ range: 'todo', from: null, to: null }, NOW)).toEqual({ from: null, to: null });
  });

  test('el resumen cuenta personas, entidad principal y último evento; el reparto omite tipos sin eventos', () => {
    const rows = [
      event('e1'),
      event('e2', { actorEmail: 'otra@x.y' }),
      event('e3', { action: 'journey.created', entityType: 'journey', actorEmail: null }),
    ];
    const s = summarize(rows);
    expect(s).toMatchObject({ total: 3, people: 2, topEntity: { type: 'package', count: 2 } });
    expect(kindShares(rows).map((x) => [x.kind, x.count])).toEqual([
      ['creacion', 1],
      ['modificacion', 2],
    ]);
    expect(summarize([]).topEntity).toBeNull();
  });

  test('las barras: días vacíos en cero y, pasados 31 días, semanas', () => {
    const rows = [event('a', { createdAt: '2026-03-10T10:00:00' }), event('b', { createdAt: '2026-03-08T10:00:00' })];
    const days = activityByDay(rows, { range: '7d', from: null, to: null }, NOW);
    expect(days).toHaveLength(7);
    expect(days.at(-1)).toMatchObject({ from: '2026-03-10', count: 1, partial: true, weekly: false });
    expect(days.find((d) => d.from === '2026-03-09')?.count).toBe(0);
    const weeks = activityByDay(
      [event('c', { createdAt: '2026-01-05T10:00:00' }), ...rows],
      { range: 'todo', from: null, to: null },
      NOW
    );
    expect(weeks.every((w) => w.weekly)).toBe(true);
    expect(weeks.at(-1)?.partial).toBe(true);
    expect(activityByDay([], { range: 'todo', from: null, to: null }, NOW)).toEqual([]);
  });
});

describe('pantalla', () => {
  const events = [
    event('e3', {
      action: 'package.status.change',
      createdAt: '2026-03-10T14:00:00',
      changes: { before: { status: 'pending' }, after: { status: 'attended' } },
    }),
    event('e2', {
      action: 'journey.deleted',
      entityType: 'journey',
      entityId: 'jjjjjjjjjjjjjjjjjjjjjjj2',
      actorEmail: 'luis@example.invalid',
      createdAt: '2026-03-09T09:00:00',
    }),
    event('e1', { action: 'package.created', createdAt: '2026-03-08T09:00:00' }),
  ];
  const setup = (
    _role: 'tenant_admin' | 'agent' | 'super_admin' = 'tenant_admin',
    routes: Record<string, unknown> = {}
  ) =>
    mockGateway({
      'GET /middleware/data/audit-logs?page=0&size=100': page(events),
      'GET /middleware/data/audit-logs/me?page=0&size=100': page(events.slice(0, 1)),
      ...routes,
    });

  beforeEach(() => {
    vi.setSystemTime(NOW);
    window.history.replaceState(null, '', '/audit');
    // La pantalla escribe con el historial: se avisa a `useSearchParams` como lo hace Next
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = History.prototype[method];
      vi.spyOn(window.history, method).mockImplementation(function (
        this: History,
        ...args: Parameters<History['pushState']>
      ) {
        original.apply(this, args);
        window.dispatchEvent(new Event(URL_EVENT));
      });
    }
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('un administrador ve los eventos de su empresa con su resumen y puede cambiar de ámbito', async () => {
    vi.useRealTimers();
    setup();
    withToasts(<AuditScreen role="tenant_admin" />);
    expect(await screen.findByText('Estado de paquete cambiado')).toBeInTheDocument();
    expect(screen.getByText('Jornada eliminada')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resumen de la actividad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mi empresa' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Mi actividad' }));
    await waitFor(() => expect(window.location.search).toBe('?ambito=mia'));
    expect(await screen.findByText('1 evento · actualizado', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('Jornada eliminada')).toBeNull();
    // en «Mi actividad» no hay filtro de persona
    expect(screen.queryByLabelText('Persona')).toBeNull();
  });

  test('un agente solo tiene su actividad y su título lo dice', async () => {
    vi.useRealTimers();
    setup('agent');
    withToasts(<AuditScreen role="agent" />);
    expect(await screen.findByText('Estado de paquete cambiado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mi empresa' })).toBeNull();
  });

  test('los filtros viven en la dirección: tipo de acción, limpiar, y el enlace compartido los aplica', async () => {
    vi.useRealTimers();
    setup();
    window.history.replaceState(null, '', '/audit?accion=eliminacion');
    withToasts(<AuditScreen role="tenant_admin" />);
    expect(await screen.findByText('Jornada eliminada')).toBeInTheDocument();
    expect(screen.queryByText('Estado de paquete cambiado')).toBeNull();
    expect(screen.getByLabelText('Tipo de acción')).toHaveValue('eliminacion');
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(await screen.findByText('Estado de paquete cambiado')).toBeInTheDocument();
    expect(window.location.search).toBe('');
    await userEvent.selectOptions(screen.getByLabelText('Persona'), 'luis@example.invalid');
    await waitFor(() => expect(screen.queryByText('Estado de paquete cambiado')).toBeNull());
    expect(window.location.search).toBe('?persona=luis%40example.invalid');
  });

  test('el ojo abre el detalle (con el evento en la dirección), muestra qué cambió y se cierra', async () => {
    vi.useRealTimers();
    setup();
    withToasts(<AuditScreen role="tenant_admin" />);
    await screen.findByText('Estado de paquete cambiado');
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Ver el detalle de «Estado de paquete cambiado» de ana.martinez@example.invalid',
      })
    );
    const dialog = await screen.findByRole('dialog');
    expect(window.location.search).toBe('?evento=e3');
    expect(within(dialog).getByRole('heading', { name: 'Qué cambió' })).toBeInTheDocument();
    expect(within(dialog).getByText('Pendiente')).toBeInTheDocument();
    expect(within(dialog).getByText('Atendido')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Abrir paquete' })).toHaveAttribute(
      'href',
      '/packages/aaaaaaaaaaaaaaaaaaaaaaa1'
    );
    // «Más de esta entidad»: el otro evento del mismo paquete
    expect(within(dialog).getByRole('button', { name: /Abrir: Paquete creado/ })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ver eventos de esta entidad' }));
    await waitFor(() => expect(window.location.search).toContain('id=aaaaaaaaaaaaaaaaaaaaaaa1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Jornada eliminada')).toBeNull();
  });

  test('un enlace con ?evento= abre la modal; si el evento no está entre los traídos lo pide por su identificador', async () => {
    vi.useRealTimers();
    const gateway = setup('tenant_admin', {
      'GET /middleware/data/audit-logs/otro': event('otro', {
        action: 'zone.updated',
        entityType: 'zone',
        entityId: 'z1',
      }),
    });
    window.history.replaceState(null, '', '/audit?evento=otro');
    withToasts(<AuditScreen role="tenant_admin" />);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Zona actualizada')).toBeInTheDocument();
    expect(gateway.sent('GET', '/middleware/data/audit-logs/otro')).toHaveLength(1);
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.search).toBe('');
  });

  test('un 403 sobre la empresa explica que falta permiso y ofrece la propia actividad', async () => {
    vi.useRealTimers();
    setup('tenant_admin', { 'GET /middleware/data/audit-logs?page=0&size=100': { status: 403, body: {} } });
    withToasts(<AuditScreen role="tenant_admin" />);
    expect(
      await screen.findByText('Tu rol no puede consultar estos eventos. Tu propia actividad sí está disponible.')
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver mi actividad' }));
    expect(await screen.findByText('Estado de paquete cambiado')).toBeInTheDocument();
  });

  test('la búsqueda y el chip de entidad también van a la dirección y se exporta lo que se ve', async () => {
    vi.useRealTimers();
    setup();
    const createUrl = vi.fn(() => 'blob:x');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() }));
    withToasts(<AuditScreen role="tenant_admin" />);
    await screen.findByText('Estado de paquete cambiado');
    await userEvent.type(screen.getByPlaceholderText('Buscar por acción o persona'), 'luis');
    await waitFor(() => expect(window.location.search).toBe('?q=luis'));
    expect(screen.queryByText('Estado de paquete cambiado')).toBeNull();
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    });
    expect(createUrl).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

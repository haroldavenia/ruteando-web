import { AUDIT_FIXTURE_LOGS, auditLog, localIso, localTime } from '../../../testing/audit';

import {
  AuditFilters,
  EMPTY_FILTERS,
  EMPTY_QUERY,
  NO_PERSON,
  applyAuditFilters,
  dayKey,
  hasActiveFilters,
  parseAuditQuery,
  parseDay,
  rangeBounds,
  toQueryParams,
} from './audit-filters';

const params = (values: Record<string, string>) => ({ get: (name: string): string | null => values[name] ?? null });
const filters = (overrides: Partial<AuditFilters>): AuditFilters => ({ ...EMPTY_FILTERS, ...overrides });

describe('audit-filters', () => {
  describe('parseDay y dayKey', () => {
    it('lee un día válido en la hora local y lo devuelve igual', () => {
      const day = parseDay('2026-10-11');
      expect(day).not.toBeNull();
      expect(dayKey(day as Date)).toBe('2026-10-11');
      expect(day?.getHours()).toBe(0);
    });

    it('rechaza lo que no es un día', () => {
      for (const value of ['2026-02-31', '2026-13-01', '11/10/2026', 'hoy', '', null, undefined]) {
        expect(parseDay(value)).withContext(String(value)).toBeNull();
      }
    });
  });

  describe('rangeBounds', () => {
    const now = localTime(2026, 10, 12, 15, 30);

    it('24 h son las últimas 24 horas, hasta este momento', () => {
      expect(rangeBounds({ range: '24h', from: null, to: null }, now).from).toBe(now - 24 * 3_600_000);
    });

    it('7 días empieza al comienzo del día de hace seis días (siete días con hoy)', () => {
      expect(rangeBounds({ range: '7d', from: null, to: null }, now).from).toBe(localTime(2026, 10, 6, 0));
    });

    it('30 días empieza al comienzo del día de hace 29 días', () => {
      expect(rangeBounds({ range: '30d', from: null, to: null }, now).from).toBe(localTime(2026, 9, 13, 0));
    });

    it('todo no pone límites', () => {
      expect(rangeBounds({ range: 'todo', from: null, to: null }, now)).toEqual({ from: null, to: null });
    });

    it('el personalizado va del comienzo del primer día al final del último, ambos inclusive', () => {
      const bounds = rangeBounds({ range: 'personalizado', from: '2026-10-05', to: '2026-10-07' }, now);
      expect(bounds.from).toBe(localTime(2026, 10, 5, 0));
      expect(bounds.to).toBe(localTime(2026, 10, 8, 0) - 1);
    });

    it('el personalizado admite un solo extremo', () => {
      expect(rangeBounds({ range: 'personalizado', from: '2026-10-05', to: null }, now).to).toBeNull();
      expect(rangeBounds({ range: 'personalizado', from: null, to: '2026-10-05' }, now).from).toBeNull();
    });
  });

  describe('applyAuditFilters', () => {
    const now = localTime(2026, 10, 12, 15, 0);

    it('sin filtros deja todo', () => {
      expect(applyAuditFilters(AUDIT_FIXTURE_LOGS, EMPTY_FILTERS, now).length).toBe(20);
    });

    it('por rango rápido deja los eventos del rango y quita los anteriores', () => {
      const rows = [
        auditLog({ id: 'a', createdAt: localIso(2026, 10, 12, 9) }),
        auditLog({ id: 'b', createdAt: localIso(2026, 10, 6, 0, 0) }),
        auditLog({ id: 'c', createdAt: localIso(2026, 10, 5, 23, 59) }),
      ];
      expect(applyAuditFilters(rows, filters({ range: '7d' }), now).map((r) => r.id)).toEqual(['a', 'b']);
      expect(applyAuditFilters(rows, filters({ range: '24h' }), now).map((r) => r.id)).toEqual(['a']);
    });

    it('por rango personalizado incluye el día de inicio y el de fin enteros', () => {
      const rows = [
        auditLog({ id: 'antes', createdAt: localIso(2026, 10, 4, 23, 59) }),
        auditLog({ id: 'inicio', createdAt: localIso(2026, 10, 5, 0, 0) }),
        auditLog({ id: 'fin', createdAt: localIso(2026, 10, 7, 23, 59) }),
        auditLog({ id: 'despues', createdAt: localIso(2026, 10, 8, 0, 1) }),
      ];
      const result = applyAuditFilters(rows, filters({ range: 'personalizado', from: '2026-10-05', to: '2026-10-07' }), now);
      expect(result.map((r) => r.id)).toEqual(['inicio', 'fin']);
    });

    it('un evento con fecha inválida no entra en un rango pero sí en «todo»', () => {
      const rows = [auditLog({ createdAt: 'no es una fecha' })];
      expect(applyAuditFilters(rows, filters({ range: '7d' }), now)).toEqual([]);
      expect(applyAuditFilters(rows, EMPTY_FILTERS, now).length).toBe(1);
    });

    it('por tipo de acción deja solo ese tipo', () => {
      expect(applyAuditFilters(AUDIT_FIXTURE_LOGS, filters({ kind: 'eliminacion' }), now).map((r) => r.action).sort()).toEqual([
        'invitation.revoked',
        'journey.delete',
      ]);
      expect(applyAuditFilters(AUDIT_FIXTURE_LOGS, filters({ kind: 'estado' }), now).length).toBe(1);
    });

    it('por persona compara el correo sin distinguir mayúsculas', () => {
      const rows = [auditLog({ actorEmail: 'Ana@Example.com' }), auditLog({ actorEmail: 'luis@example.com' })];
      expect(applyAuditFilters(rows, filters({ person: 'ana@example.com' }), now).length).toBe(1);
    });

    it('«sin identificar» deja los eventos sin correo', () => {
      const rows = [auditLog({ actorEmail: null }), auditLog({ actorEmail: '  ' }), auditLog({ actorEmail: 'a@b.c' })];
      expect(applyAuditFilters(rows, filters({ person: NO_PERSON }), now).length).toBe(2);
      expect(applyAuditFilters(AUDIT_FIXTURE_LOGS, filters({ person: NO_PERSON }), now).length).toBe(12);
    });

    it('«solo con cambios» quita los que no traen changes o los traen idénticos', () => {
      expect(applyAuditFilters(AUDIT_FIXTURE_LOGS, filters({ onlyChanges: true }), now).length).toBe(4);
    });

    it('por entidad deja los eventos de ese identificador', () => {
      const result = applyAuditFilters(AUDIT_FIXTURE_LOGS, filters({ entityId: '6acb99b48275a26dbdf8fcf5' }), now);
      expect(result.length).toBe(5);
      expect(result.every((r) => r.entityType === 'resource')).toBeTrue();
    });

    it('los filtros se combinan con «y»', () => {
      const result = applyAuditFilters(AUDIT_FIXTURE_LOGS, filters({ kind: 'asignacion', onlyChanges: true, entityId: '6acb99b48275a26dbdf8fcf5' }), now);
      expect(result.length).toBe(3);
      expect(applyAuditFilters(AUDIT_FIXTURE_LOGS, filters({ kind: 'eliminacion', onlyChanges: true }), now)).toEqual([]);
    });

    it('no modifica la lista de entrada', () => {
      const copy = [...AUDIT_FIXTURE_LOGS];
      applyAuditFilters(AUDIT_FIXTURE_LOGS, filters({ kind: 'creacion' }), now);
      expect(AUDIT_FIXTURE_LOGS).toEqual(copy);
    });
  });

  it('hasActiveFilters distingue la vista sin filtros de cualquier filtro', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBeFalse();
    expect(hasActiveFilters(filters({ kind: 'creacion' }))).toBeTrue();
    expect(hasActiveFilters(filters({ person: NO_PERSON }))).toBeTrue();
    expect(hasActiveFilters(filters({ range: '7d' }))).toBeTrue();
    expect(hasActiveFilters(filters({ onlyChanges: true }))).toBeTrue();
    expect(hasActiveFilters(filters({ entityId: 'abc' }))).toBeTrue();
  });

  describe('dirección de la página', () => {
    it('sin parámetros es la vista vacía', () => {
      expect(parseAuditQuery(params({}))).toEqual(EMPTY_QUERY);
    });

    it('lee todos los parámetros que reconoce', () => {
      const query = parseAuditQuery(
        params({
          ambito: 'empresa',
          empresa: 'abc123',
          q: ' asignado ',
          entidad: 'package',
          accion: 'estado',
          persona: 'ana@example.com',
          rango: '7d',
          cambios: '1',
          id: 'ent1',
          evento: 'evt9',
        }),
      );
      expect(query).toEqual({
        scope: 'empresa',
        tenant: 'abc123',
        text: 'asignado',
        entity: 'package',
        kind: 'estado',
        person: 'ana@example.com',
        range: '7d',
        from: null,
        to: null,
        onlyChanges: true,
        entityId: 'ent1',
        event: 'evt9',
      });
    });

    it('desde y hasta hacen el rango personalizado y mandan sobre rango', () => {
      const query = parseAuditQuery(params({ rango: '7d', desde: '2026-10-05', hasta: '2026-10-07' }));
      expect(query.range).toBe('personalizado');
      expect(query.from).toBe('2026-10-05');
      expect(query.to).toBe('2026-10-07');
    });

    it('un solo extremo también es personalizado', () => {
      expect(parseAuditQuery(params({ desde: '2026-10-05' })).range).toBe('personalizado');
    });

    it('ignora sin error los valores que no reconoce', () => {
      const query = parseAuditQuery(
        params({
          ambito: 'galaxia',
          empresa: 'a b/c',
          entidad: '<script>',
          accion: 'explotar',
          persona: 'con espacios',
          rango: '1000d',
          desde: '2026-02-31',
          hasta: 'ayer',
          cambios: 'si',
          id: '../me',
          evento: '<script>',
        }),
      );
      expect(query).toEqual(EMPTY_QUERY);
    });

    it('recorta una búsqueda desmesurada', () => {
      expect(parseAuditQuery(params({ q: 'x'.repeat(500) })).text.length).toBe(200);
    });

    it('toQueryParams pone null en lo que vale el valor por defecto', () => {
      expect(toQueryParams(EMPTY_QUERY)).toEqual({
        ambito: null,
        empresa: null,
        q: null,
        entidad: null,
        accion: null,
        persona: null,
        rango: null,
        desde: null,
        hasta: null,
        cambios: null,
        id: null,
        evento: null,
      });
    });

    it('ida y vuelta: lo que se escribe en la dirección se lee igual', () => {
      const original = {
        ...EMPTY_QUERY,
        scope: 'todas' as const,
        tenant: 'abc',
        text: 'jornada',
        entity: 'journey',
        kind: 'eliminacion' as const,
        person: 'ana@example.com',
        range: 'personalizado' as const,
        from: '2026-10-05',
        to: '2026-10-07',
        onlyChanges: true,
        entityId: 'ent9',
        event: 'evt3',
      };
      const written = toQueryParams(original);
      const read = parseAuditQuery({ get: (name) => written[name] ?? null });
      expect(read).toEqual(original);
    });

    it('un rango rápido no escribe desde ni hasta, y uno personalizado no escribe rango', () => {
      expect(toQueryParams({ ...EMPTY_QUERY, range: '30d' })).toEqual(jasmine.objectContaining({ rango: '30d', desde: null, hasta: null }));
      expect(toQueryParams({ ...EMPTY_QUERY, range: 'personalizado', from: '2026-10-05' })).toEqual(
        jasmine.objectContaining({ rango: null, desde: '2026-10-05', hasta: null }),
      );
    });
  });
});

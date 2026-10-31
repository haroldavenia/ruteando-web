import { AUDIT_FIXTURE_LOGS, auditLog, localIso, localTime } from '../../../testing/audit';

import { DAILY_LIMIT, WEEKLY_LIMIT, activityByDay, kindShares, summarize } from './audit-stats';

describe('audit-stats', () => {
  describe('summarize', () => {
    it('cuenta eventos, personas, la entidad más tocada y el último evento', () => {
      const summary = summarize(AUDIT_FIXTURE_LOGS);
      expect(summary.total).toBe(20);
      expect(summary.people).toBe(1);
      // El ejemplo tiene 5 eventos de resource y 5 de user: en empate gana el nombre que va primero
      expect(summary.topEntity).toEqual({ type: 'resource', count: 5 });
      expect(summary.last).toBe('2026-10-11T14:14:14.039Z');
    });

    it('las personas se cuentan por correo sin distinguir mayúsculas y sin contar a quien no lo trae', () => {
      const rows = [
        auditLog({ actorEmail: 'Ana@x.com' }),
        auditLog({ actorEmail: 'ana@x.com' }),
        auditLog({ actorEmail: 'luis@x.com' }),
        auditLog({ actorEmail: null }),
        auditLog({ actorEmail: '' }),
      ];
      expect(summarize(rows).people).toBe(2);
    });

    it('sin eventos todo es cero o vacío', () => {
      expect(summarize([])).toEqual({ total: 0, people: 0, topEntity: null, last: null });
    });

    it('ignora una fecha inválida al buscar el último evento', () => {
      const rows = [auditLog({ createdAt: 'nada' }), auditLog({ createdAt: '2026-10-01T00:00:00Z' })];
      expect(summarize(rows).last).toBe('2026-10-01T00:00:00Z');
    });
  });

  describe('kindShares', () => {
    it('reparte los eventos por tipo, en orden, sin los tipos vacíos', () => {
      const shares = kindShares(AUDIT_FIXTURE_LOGS);
      expect(shares.map((s) => [s.kind, s.count])).toEqual([
        ['creacion', 7],
        ['modificacion', 5],
        ['eliminacion', 2],
        ['estado', 1],
        ['asignacion', 3],
        ['otras', 2],
      ]);
      expect(shares[0].percent).toBeCloseTo(35, 5);
      expect(shares.reduce((sum, s) => sum + s.percent, 0)).toBeCloseTo(100, 5);
    });

    it('sin eventos no hay reparto', () => {
      expect(kindShares([])).toEqual([]);
    });
  });

  describe('activityByDay', () => {
    const now = localTime(2026, 10, 12, 15, 0);

    it('7 días son siete barras, con los días vacíos en cero y hoy como parcial', () => {
      const rows = [
        auditLog({ createdAt: localIso(2026, 10, 12, 9) }),
        auditLog({ createdAt: localIso(2026, 10, 12, 10) }),
        auditLog({ createdAt: localIso(2026, 10, 8, 10) }),
      ];
      const buckets = activityByDay(rows, { range: '7d', from: null, to: null }, now);
      expect(buckets.length).toBe(7);
      expect(buckets.map((b) => b.from)).toEqual(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
      expect(buckets.map((b) => b.count)).toEqual([0, 0, 1, 0, 0, 0, 2]);
      expect(buckets.map((b) => b.partial)).toEqual([false, false, false, false, false, false, true]);
      expect(buckets.every((b) => !b.weekly && b.from === b.to)).toBeTrue();
    });

    it('24 horas muestra ayer y hoy', () => {
      const buckets = activityByDay([], { range: '24h', from: null, to: null }, now);
      expect(buckets.map((b) => b.from)).toEqual(['2026-10-11', '2026-10-12']);
    });

    it('30 días son 30 barras diarias', () => {
      expect(activityByDay([], { range: '30d', from: null, to: null }, now).length).toBe(30);
    });

    it('«todo» arranca el día del evento más antiguo y llega hasta hoy', () => {
      const rows = [auditLog({ createdAt: localIso(2026, 10, 9, 8) })];
      const buckets = activityByDay(rows, { range: 'todo', from: null, to: null }, now);
      expect(buckets.map((b) => b.from)).toEqual(['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
      expect(buckets[0].count).toBe(1);
    });

    it('«todo» sin eventos no pinta barras', () => {
      expect(activityByDay([], { range: 'todo', from: null, to: null }, now)).toEqual([]);
    });

    it('un rango personalizado cubre del primer al último día aunque estén vacíos', () => {
      const buckets = activityByDay([], { range: 'personalizado', from: '2026-10-05', to: '2026-10-07' }, now);
      expect(buckets.map((b) => b.from)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
      expect(buckets.some((b) => b.partial)).toBeFalse();
    });

    it('un rango personalizado con fin futuro llega solo hasta hoy', () => {
      const buckets = activityByDay([], { range: 'personalizado', from: '2026-10-10', to: '2026-12-31' }, now);
      expect(buckets.map((b) => b.from)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12']);
    });

    it('con un inicio posterior a hoy no hay barras', () => {
      expect(activityByDay([], { range: 'personalizado', from: '2027-01-01', to: null }, now)).toEqual([]);
    });

    it(`más de ${DAILY_LIMIT} días se agrupan por semana (lunes a domingo) y la semana de hoy es parcial`, () => {
      const rows = [
        auditLog({ createdAt: localIso(2026, 8, 3, 10) }), // lunes
        auditLog({ createdAt: localIso(2026, 8, 9, 10) }), // domingo de la misma semana
        auditLog({ createdAt: localIso(2026, 10, 12, 9) }), // hoy, lunes
      ];
      const buckets = activityByDay(rows, { range: 'todo', from: null, to: null }, now);
      expect(buckets.every((b) => b.weekly)).toBeTrue();
      expect(buckets[0]).toEqual({ from: '2026-08-03', to: '2026-08-09', count: 2, partial: false, weekly: true });
      const last = buckets[buckets.length - 1];
      expect(last).toEqual({ from: '2026-10-12', to: '2026-10-18', count: 1, partial: true, weekly: true });
    });

    it(`nunca pinta más de ${WEEKLY_LIMIT} semanas`, () => {
      const rows = [auditLog({ createdAt: localIso(2024, 1, 10, 9) })];
      const buckets = activityByDay(rows, { range: 'todo', from: null, to: null }, now);
      expect(buckets.length).toBe(WEEKLY_LIMIT);
      expect(buckets[buckets.length - 1].partial).toBeTrue();
    });

    it('la suma de las barras es el número de eventos del rango', () => {
      const rows = Array.from({ length: 12 }, (_, i) => auditLog({ createdAt: localIso(2026, 10, 7 + (i % 6), 10) }));
      const buckets = activityByDay(rows, { range: '7d', from: null, to: null }, now);
      expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(12);
    });
  });
});

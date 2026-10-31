import { AuditLog } from '../../core/api/models';

import { AuditFilters, addDays, dayKey, parseDay, startOfDay } from './audit-filters';
import { AUDIT_KINDS, AuditKind, auditKind } from './audit-labels';

export interface AuditSummary {
  total: number;
  /** Correos distintos que actuaron; los eventos sin correo no cuentan. */
  people: number;
  /** Tipo de entidad con más eventos (en empate, el primero por nombre). */
  topEntity: { type: string; count: number } | null;
  /** Instante del evento más reciente. */
  last: string | null;
}

export function summarize(rows: readonly AuditLog[]): AuditSummary {
  const people = new Set<string>();
  const byEntity = new Map<string, number>();
  let last: string | null = null;
  let lastTime = -Infinity;
  for (const row of rows) {
    const email = row.actorEmail?.trim().toLowerCase();
    if (email) {
      people.add(email);
    }
    byEntity.set(row.entityType, (byEntity.get(row.entityType) ?? 0) + 1);
    const time = Date.parse(row.createdAt);
    if (!Number.isNaN(time) && time > lastTime) {
      lastTime = time;
      last = row.createdAt;
    }
  }
  const top = [...byEntity.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return { total: rows.length, people: people.size, topEntity: top ? { type: top[0], count: top[1] } : null, last };
}

export interface KindShare {
  kind: AuditKind;
  count: number;
  /** De 0 a 100. */
  percent: number;
}

/** Reparto de los eventos entre los tipos de acción, en el orden de `AUDIT_KINDS` y sin los tipos sin eventos. */
export function kindShares(rows: readonly AuditLog[]): KindShare[] {
  const counts = new Map<AuditKind, number>();
  for (const row of rows) {
    const kind = auditKind(row.action);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return AUDIT_KINDS.filter((kind) => (counts.get(kind) ?? 0) > 0).map((kind) => ({
    kind,
    count: counts.get(kind) ?? 0,
    percent: ((counts.get(kind) ?? 0) / rows.length) * 100,
  }));
}

export interface ActivityBucket {
  /** Primer día del grupo (`AAAA-MM-DD`). */
  from: string;
  /** Último día del grupo, inclusive. */
  to: string;
  count: number;
  /** El grupo contiene el día de hoy, que aún no terminó. */
  partial: boolean;
  /** Agrupa una semana (lunes a domingo) en lugar de un día. */
  weekly: boolean;
}

/** Hasta cuántos días se pintan las barras de a uno; más allá se agrupan por semana. */
export const DAILY_LIMIT = 31;
/** Cuántas semanas como máximo se pintan. */
export const WEEKLY_LIMIT = 26;

function mondayOf(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}

/**
 * Eventos por día (en la hora local) sobre el rango de los filtros, con los días vacíos en cero. Con un rango rápido cubre sus días;
 * con «todo» o uno personalizado abierto, desde el día del evento más antiguo. Más de 31 días se agrupan por semana (las últimas 26).
 */
export function activityByDay(
  rows: readonly AuditLog[],
  filters: Pick<AuditFilters, 'range' | 'from' | 'to'>,
  now: number = Date.now(),
): ActivityBucket[] {
  const today = startOfDay(now);
  let first: Date | null = null;
  let last = today;
  switch (filters.range) {
    case '24h':
      first = addDays(today, -1);
      break;
    case '7d':
      first = addDays(today, -6);
      break;
    case '30d':
      first = addDays(today, -29);
      break;
    case 'personalizado': {
      first = parseDay(filters.from);
      const end = parseDay(filters.to);
      last = end && end.getTime() < today.getTime() ? end : today;
      break;
    }
    default:
      break;
  }
  if (first === null) {
    const earliest = rows.reduce((min, row) => Math.min(min, Date.parse(row.createdAt) || Infinity), Infinity);
    if (earliest === Infinity) {
      return [];
    }
    first = startOfDay(earliest);
  }
  if (first.getTime() > last.getTime()) {
    return [];
  }

  const days = Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1;
  const weekly = days > DAILY_LIMIT;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const time = Date.parse(row.createdAt);
    if (Number.isNaN(time)) {
      continue;
    }
    const day = startOfDay(time);
    const key = dayKey(weekly ? mondayOf(day) : day);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const todayKey = dayKey(today);
  const buckets: ActivityBucket[] = [];
  const step = weekly ? 7 : 1;
  for (let cursor = weekly ? mondayOf(first) : first; cursor.getTime() <= last.getTime(); cursor = addDays(cursor, step)) {
    const from = dayKey(cursor);
    const to = dayKey(addDays(cursor, step - 1));
    buckets.push({ from, to, count: counts.get(from) ?? 0, partial: from <= todayKey && todayKey <= to, weekly });
  }
  return weekly ? buckets.slice(-WEEKLY_LIMIT) : buckets;
}

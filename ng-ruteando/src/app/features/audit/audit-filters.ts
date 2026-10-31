import { AuditLog } from '../../core/api/models';

import { hasValueChanges } from './audit-diff';
import { AUDIT_KINDS, AuditKind, auditKind } from './audit-labels';
import { AuditScopeId } from './audit-scopes';

/** Rango de fechas: los tres rápidos, todo y uno personalizado (`from` y `to`, días completos y ambos inclusive). */
export type AuditRange = '24h' | '7d' | '30d' | 'todo' | 'personalizado';

const QUICK_RANGES: readonly AuditRange[] = ['24h', '7d', '30d', 'todo'];

/** Valor de «persona» para los eventos que no traen correo. */
export const NO_PERSON = '_sin';

/** Filtros que se aplican antes de la tabla: la búsqueda y el chip de entidad los pone la propia tabla. */
export interface AuditFilters {
  kind: AuditKind | null;
  /** Correo del autor, o `NO_PERSON`. */
  person: string | null;
  range: AuditRange;
  /** Día `AAAA-MM-DD` de inicio y de fin del rango personalizado. */
  from: string | null;
  to: string | null;
  onlyChanges: boolean;
  /** Solo los eventos de esta entidad. */
  entityId: string | null;
}

/** Todo lo que lleva la dirección de la página. */
export interface AuditQuery extends AuditFilters {
  scope: AuditScopeId | null;
  /** Empresa a la que se limita «Todas las empresas». */
  tenant: string;
  /** Texto de la búsqueda. */
  text: string;
  /** Chip de tipo de entidad. */
  entity: string | null;
  /** Evento abierto en la modal de detalle. */
  event: string | null;
}

export const EMPTY_FILTERS: AuditFilters = {
  kind: null,
  person: null,
  range: 'todo',
  from: null,
  to: null,
  onlyChanges: false,
  entityId: null,
};

export const EMPTY_QUERY: AuditQuery = { ...EMPTY_FILTERS, scope: null, tenant: '', text: '', entity: null, event: null };

export function hasActiveFilters(filters: AuditFilters): boolean {
  return (
    filters.kind !== null ||
    filters.person !== null ||
    filters.range !== 'todo' ||
    filters.onlyChanges ||
    filters.entityId !== null
  );
}

// ---------- Días en la hora local ----------

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha local de un día `AAAA-MM-DD`, o `null` si no existe (`2026-02-31`). */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value || !DAY.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** `AAAA-MM-DD` del día local de una fecha. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfDay(time: number): Date {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Límites en milisegundos del rango (`null` = sin límite). 7 y 30 días son días de calendario, el de hoy incluido. */
export function rangeBounds(
  filters: Pick<AuditFilters, 'range' | 'from' | 'to'>,
  now: number,
): { from: number | null; to: number | null } {
  switch (filters.range) {
    case '24h':
      return { from: now - 24 * 3_600_000, to: null };
    case '7d':
      return { from: addDays(startOfDay(now), -6).getTime(), to: null };
    case '30d':
      return { from: addDays(startOfDay(now), -29).getTime(), to: null };
    case 'personalizado': {
      const from = parseDay(filters.from);
      const to = parseDay(filters.to);
      return { from: from ? from.getTime() : null, to: to ? addDays(to, 1).getTime() - 1 : null };
    }
    default:
      return { from: null, to: null };
  }
}

/** Eventos que cumplen todos los filtros (se combinan con «y»). */
export function applyAuditFilters(rows: readonly AuditLog[], filters: AuditFilters, now: number = Date.now()): AuditLog[] {
  const { from, to } = rangeBounds(filters, now);
  const person = filters.person?.toLowerCase() ?? null;
  return rows.filter((row) => {
    if (from !== null || to !== null) {
      const time = Date.parse(row.createdAt);
      if (Number.isNaN(time) || (from !== null && time < from) || (to !== null && time > to)) {
        return false;
      }
    }
    if (filters.kind !== null && auditKind(row.action) !== filters.kind) {
      return false;
    }
    if (person !== null) {
      const email = row.actorEmail?.trim().toLowerCase() ?? '';
      if (person === NO_PERSON ? email !== '' : email !== person) {
        return false;
      }
    }
    if (filters.onlyChanges && !hasValueChanges(row.changes)) {
      return false;
    }
    return filters.entityId === null || row.entityId === filters.entityId;
  });
}

// ---------- Dirección de la página ----------

/** Cualquier cosa con `get(nombre)`, como `ParamMap`. */
export interface ParamSource {
  get(name: string): string | null;
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const SAFE_PERSON = /^\S{1,200}$/;
const SCOPES: readonly string[] = ['empresa', 'mia', 'todas'];

function pick<V extends string>(value: string | null, allowed: readonly V[]): V | null {
  return allowed.find((option) => option === value) ?? null;
}

/** Lee la dirección: lo que no se reconoce se ignora sin error. */
export function parseAuditQuery(params: ParamSource): AuditQuery {
  const from = parseDay(params.get('desde')) ? params.get('desde') : null;
  const to = parseDay(params.get('hasta')) ? params.get('hasta') : null;
  const quick = pick(params.get('rango'), QUICK_RANGES);
  const person = params.get('persona');
  const tenant = params.get('empresa');
  const entity = params.get('entidad');
  const entityId = params.get('id');
  const event = params.get('evento');
  return {
    scope: pick(params.get('ambito'), SCOPES as readonly AuditScopeId[]),
    tenant: tenant && SAFE_ID.test(tenant) ? tenant : '',
    text: (params.get('q') ?? '').trim().slice(0, 200),
    entity: entity && SAFE_ID.test(entity) ? entity : null,
    event: event && SAFE_ID.test(event) ? event : null,
    kind: pick(params.get('accion'), AUDIT_KINDS),
    person: person && SAFE_PERSON.test(person) ? person : null,
    range: from || to ? 'personalizado' : (quick ?? 'todo'),
    from,
    to,
    onlyChanges: params.get('cambios') === '1',
    entityId: entityId && SAFE_ID.test(entityId) ? entityId : null,
  };
}

/** Parámetros de la dirección de una vista; `null` quita el parámetro (lo que vale el valor por defecto no se escribe). */
export function toQueryParams(query: AuditQuery): Record<string, string | null> {
  const custom = query.range === 'personalizado';
  return {
    ambito: query.scope,
    empresa: query.tenant || null,
    q: query.text || null,
    entidad: query.entity,
    accion: query.kind,
    persona: query.person,
    rango: custom || query.range === 'todo' ? null : query.range,
    desde: custom ? query.from : null,
    hasta: custom ? query.to : null,
    cambios: query.onlyChanges ? '1' : null,
    id: query.entityId,
    evento: query.event,
  };
}

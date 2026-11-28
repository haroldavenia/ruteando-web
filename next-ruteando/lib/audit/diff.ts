import type { AuditChanges } from '@/lib/api/models';
import type { TFunction } from '@/lib/i18n/core';
import { packageStatusLabel } from '@/lib/packages/labels';

/** Nombres de los campos que más aparecen en `changes`; el resto se muestra con su clave. */
export function auditFieldLabel(field: string, t: TFunction): string {
  const labels: Record<string, string> = {
    status: t('Estado'),
    driverId: t('Conductor'),
    name: t('Nombre'),
    licensePlate: t('Matrícula'),
    quantity: t('Cantidad'),
    type: t('Tipo'),
    address: t('Dirección'),
    routeTopology: t('Forma de la ruta'),
    restrictionType: t('Tipo de restricción'),
    fixedRoutes: t('Rutas fijas'),
    lengthOfStay: t('Duración de la parada'),
    email: t('Correo'),
    role: t('Rol'),
    active: t('Activo'),
  };
  return labels[field] ?? field;
}

const isEmpty = (value: unknown): boolean => value === null || value === undefined || value === '';

/** Valor tal como se lee: vacío como «(vacío)», texto y números tal cual y objetos o listas como JSON compacto. */
export function displayValue(value: unknown, t: TFunction): string {
  if (isEmpty(value)) return t('(vacío)');
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Dos valores son iguales si lo son, o si los dos están vacíos (`""` y `null` cuentan igual). */
function sameValue(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface DiffRow {
  field: string;
  label: string;
  before: string;
  after: string;
  beforeEmpty: boolean;
  afterEmpty: boolean;
  changed: boolean;
}

/** Valor de un campo para mostrar, con el nombre del estado de un paquete en lugar de su clave. */
function shown(field: string, value: unknown, entityType: string | undefined, t: TFunction): string {
  if (entityType === 'package' && field === 'status' && typeof value === 'string' && value !== '') {
    return packageStatusLabel(value, t);
  }
  return displayValue(value, t);
}

/**
 * Campo a campo, el antes y el después de un evento. Los campos que cambiaron van primero (el resto conserva su orden) y los que están
 * vacíos de los dos lados no cuentan como cambio.
 */
export function diffChanges(changes: AuditChanges | null | undefined, t: TFunction, entityType?: string): DiffRow[] {
  const before = changes?.before ?? {};
  const after = changes?.after ?? {};
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const rows = fields.map((field): DiffRow => {
    const was = before[field];
    const now = after[field];
    return {
      field,
      label: auditFieldLabel(field, t),
      before: shown(field, was, entityType, t),
      after: shown(field, now, entityType, t),
      beforeEmpty: isEmpty(was),
      afterEmpty: isEmpty(now),
      changed: !sameValue(was, now),
    };
  });
  return [...rows.filter((row) => row.changed), ...rows.filter((row) => !row.changed)];
}

/** El evento registra al menos un campo cuyo valor cambió. */
export function hasValueChanges(changes: AuditChanges | null | undefined): boolean {
  const before = changes?.before ?? {};
  const after = changes?.after ?? {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].some(
    (field) => !sameValue(before[field], after[field])
  );
}

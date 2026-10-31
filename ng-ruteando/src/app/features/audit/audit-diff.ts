import { AuditChanges } from '../../core/api/models';
import { packageStatusLabel } from '../packages/package-labels';

export const EMPTY_VALUE = '(vacío)';

/** Nombres en español de los campos que más aparecen en `changes`; el resto se muestra con su clave. */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  status: 'Estado',
  driverId: 'Conductor',
  name: 'Nombre',
  licensePlate: 'Matrícula',
  quantity: 'Cantidad',
  type: 'Tipo',
  address: 'Dirección',
  routeTopology: 'Forma de la ruta',
  restrictionType: 'Tipo de restricción',
  fixedRoutes: 'Rutas fijas',
  lengthOfStay: 'Duración de la parada',
  email: 'Correo',
  role: 'Rol',
  active: 'Activo',
};

export const auditFieldLabel = (field: string): string => FIELD_LABELS[field] ?? field;

const isEmpty = (value: unknown): boolean => value === null || value === undefined || value === '';

/** Valor tal como se lee: vacío como «(vacío)», texto y números tal cual y objetos o listas como JSON compacto. */
export function displayValue(value: unknown): string {
  if (isEmpty(value)) {
    return EMPTY_VALUE;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/** Dos valores son iguales si lo son, o si los dos están vacíos (`""` y `null` cuentan igual). */
function sameValue(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) {
    return true;
  }
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
function shown(field: string, value: unknown, entityType: string | undefined): string {
  if (entityType === 'package' && field === 'status' && typeof value === 'string' && value !== '') {
    return packageStatusLabel(value);
  }
  return displayValue(value);
}

/**
 * Campo a campo, el antes y el después de un evento. Los campos que cambiaron van primero (el resto conserva su orden) y los
 * que están vacíos de los dos lados no cuentan como cambio.
 */
export function diffChanges(changes: AuditChanges | null | undefined, entityType?: string): DiffRow[] {
  const before = changes?.before ?? {};
  const after = changes?.after ?? {};
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const rows = fields.map((field): DiffRow => {
    const was = before[field];
    const now = after[field];
    return {
      field,
      label: auditFieldLabel(field),
      before: shown(field, was, entityType),
      after: shown(field, now, entityType),
      beforeEmpty: isEmpty(was),
      afterEmpty: isEmpty(now),
      changed: !sameValue(was, now),
    };
  });
  return [...rows.filter((row) => row.changed), ...rows.filter((row) => !row.changed)];
}

/** El evento registra al menos un campo cuyo valor cambió. */
export function hasValueChanges(changes: AuditChanges | null | undefined): boolean {
  return diffChanges(changes).some((row) => row.changed);
}

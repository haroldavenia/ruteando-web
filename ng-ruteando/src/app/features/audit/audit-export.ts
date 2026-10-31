import { AuditLog } from '../../core/api/models';
import { toCsv } from '../../shared/data/csv';

import { diffChanges } from './audit-diff';
import { auditActionLabel, auditActor, auditEntityLabel, auditKind, auditKindLabel, auditSummary } from './audit-labels';

const HEADER = ['Instante (UTC)', 'Acción', 'Tipo de acción', 'Entidad', 'Identificador', 'Persona', 'Rol', 'Resumen'];

/** Qué cambió, para una celda: `campo: antes → después` de los campos que cambiaron, separados por « | ». */
function changesText(log: AuditLog): string {
  return diffChanges(log.changes, log.entityType)
    .filter((row) => row.changed)
    .map((row) => `${row.label}: ${row.before} → ${row.after}`)
    .join(' | ');
}

/**
 * CSV de los eventos tal como llegan (el orden de la lista), con las claves y los identificadores completos para quien los
 * cruza con otros sistemas. La columna de la IP solo está si algún evento la trae (`/audit-logs/me` no la entrega).
 */
export function auditToCsv(rows: readonly AuditLog[]): string {
  const withIp = rows.some((row) => !!row.ipAddress);
  const header = [...HEADER, ...(withIp ? ['IP'] : []), 'Cambios'];
  const body = rows.map((log) => {
    const actor = auditActor(log);
    return [
      log.createdAt,
      `${auditActionLabel(log.action)} (${log.action})`,
      auditKindLabel(auditKind(log.action)),
      auditEntityLabel(log.entityType),
      log.entityId,
      actor.identified ? actor.person : '',
      actor.role ?? '',
      auditSummary(log),
      ...(withIp ? [log.ipAddress ?? ''] : []),
      changesText(log),
    ];
  });
  return toCsv(header, body);
}

/** `auditoria-AAAA-MM-DD.csv` con la fecha local. */
export function auditCsvFileName(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `auditoria-${now.getFullYear()}-${month}-${day}.csv`;
}

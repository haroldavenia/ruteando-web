import type { AuditLog } from '@/lib/api/models';
import { toCsv } from '@/lib/csv';
import type { TFunction } from '@/lib/i18n/core';

import { diffChanges } from './diff';
import { auditActionLabel, auditActor, auditEntityLabel, auditKind, auditKindLabel, auditSummary } from './labels';

/** Qué cambió, para una celda: `campo: antes → después` de los campos que cambiaron, separados por « | ». */
function changesText(log: AuditLog, t: TFunction): string {
  return diffChanges(log.changes, t, log.entityType)
    .filter((row) => row.changed)
    .map((row) => `${row.label}: ${row.before} → ${row.after}`)
    .join(' | ');
}

/**
 * CSV de los eventos tal como llegan (el orden de la lista), con las claves y los identificadores completos para quien los cruza con otros
 * sistemas. La columna de la IP solo está si algún evento la trae (`/audit-logs/me` no la entrega).
 */
export function auditToCsv(rows: readonly AuditLog[], t: TFunction): string {
  const withIp = rows.some((row) => !!row.ipAddress);
  const header = [
    'Instante (UTC)',
    t('Acción'),
    t('Tipo de acción'),
    t('Entidad'),
    t('Identificador'),
    t('Persona'),
    t('Rol'),
    t('Resumen'),
    ...(withIp ? ['IP'] : []),
    t('Cambios'),
  ];
  const body = rows.map((log) => {
    const actor = auditActor(log, t);
    return [
      log.createdAt,
      `${auditActionLabel(log.action, t)} (${log.action})`,
      auditKindLabel(auditKind(log.action), t),
      auditEntityLabel(log.entityType, t),
      log.entityId,
      actor.identified ? actor.person : '',
      actor.role ?? '',
      auditSummary(log, t),
      ...(withIp ? [log.ipAddress ?? ''] : []),
      changesText(log, t),
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

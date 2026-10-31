import { Page } from '../app/core/api/api-config';
import { AuditLog } from '../app/core/api/models';

import list from './fixtures/gateway/get__audit-logs.json';

/** Los 20 eventos reales de la primera página de `GET /audit-logs`. */
export const AUDIT_FIXTURE_LOGS = (list.response.body as unknown as { content: AuditLog[] }).content;

let counter = 0;

/** Evento ficticio con valores por defecto; cualquier campo se puede cambiar. */
export function auditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  counter += 1;
  return {
    id: `evt${String(counter).padStart(21, '0')}`,
    action: 'package.create',
    entityType: 'package',
    entityId: `ent${String(counter).padStart(21, '0')}`,
    description: 'Paquete creado: guide=null',
    actorEmail: 'ana@example.com',
    actorRole: 'tenant_admin',
    changes: null,
    createdAt: '2026-10-11T14:14:14.039Z',
    ipAddress: '10.0.0.1',
    ...overrides,
  };
}

/** Instante ISO de una fecha y hora LOCALES (las pruebas de días no dependen de la zona horaria de quien las ejecuta). */
export function localIso(year: number, month: number, day: number, hour = 12, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

/** Milisegundos de una fecha y hora locales. */
export function localTime(year: number, month: number, day: number, hour = 12, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

/** Página de auditoría como la entrega `AuditLogsApi` (con `page`, no `number`). */
export function auditPage(content: AuditLog[], totalElements = content.length, page = 0, size = 100): Page<AuditLog> {
  return { content, page, size, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / size)) };
}

/** Cuerpo de página tal como lo manda el gateway (con `number`). */
export function gatewayAuditPage(content: AuditLog[], totalElements = content.length, number = 0, size = 100): object {
  return { content, number, size, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / size)) };
}

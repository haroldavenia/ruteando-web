/** Valores de los campos de un evento antes y después del cambio, tal cual los registra el gateway. */
export type AuditValues = Record<string, unknown>;

/** Lo que cambió un evento: el estado anterior y el posterior de los campos afectados. Cualquiera de los dos puede faltar. */
export interface AuditChanges {
  before?: AuditValues | null;
  after?: AuditValues | null;
}

/**
 * Evento de auditoría. `action` es una clave (`package.status.change`) y `entityType` el tipo de lo afectado; ambos pueden
 * traer valores que la aplicación aún no conoce. El rol llega con mayúsculas distintas según el evento (`TENANT_ADMIN`,
 * `tenant_admin`) y puede ser `anonymous`; el correo del autor puede faltar. `ipAddress` no viene en `/audit-logs/me`.
 */
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  changes: AuditChanges | null;
  /** Instante ISO (UTC). */
  createdAt: string;
  ipAddress?: string | null;
}

/** Página tal como la devuelve el gateway en auditoría: la página se llama `number` (en el resto de recursos, `page`). */
export interface AuditLogPage {
  content: AuditLog[];
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

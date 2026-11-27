import type { UserRole } from './session-token';

/** Quién administra la empresa. */
export const ADMIN_ROLES: readonly UserRole[] = ['tenant_admin', 'super_admin'];

/** Quién opera el día a día (planifica jornadas, gestiona paquetes): los administradores y los agentes. */
export const OPERATIONS_ROLES: readonly UserRole[] = [...ADMIN_ROLES, 'agent'];

/** Todos los roles, conductores incluidos. */
export const ALL_ROLES: readonly UserRole[] = [...OPERATIONS_ROLES, 'driver'];

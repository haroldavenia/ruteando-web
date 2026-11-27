import type { AuditLog } from '@/lib/api/models';
import type { TFunction } from '@/lib/i18n/core';
import { ADMIN_ROLES, OPERATIONS_ROLES } from '@/lib/roles';
import type { UserRole } from '@/lib/session-token';

import { isDeletion } from './labels';

interface Target {
  /** Ruta de la pantalla de la entidad, sin el id. */
  base: string;
  /** Clave del nombre para el enlace («Abrir paquete»). */
  noun: string;
  /** Quienes pueden abrir esa pantalla: las mismas guardas que protegen su ruta. */
  roles: readonly UserRole[];
}

const TARGETS: Readonly<Record<string, Target>> = {
  package: { base: '/packages', noun: 'paquete', roles: OPERATIONS_ROLES },
  journey: { base: '/journeys', noun: 'jornada', roles: OPERATIONS_ROLES },
  place: { base: '/places', noun: 'lugar', roles: ADMIN_ROLES },
  settings: { base: '/settings', noun: 'configuración', roles: ADMIN_ROLES },
  resource: { base: '/fleet/vehicles', noun: 'vehículo', roles: ADMIN_ROLES },
  resource_type: { base: '/fleet/types', noun: 'tipo de vehículo', roles: ADMIN_ROLES },
  'resource-type': { base: '/fleet/types', noun: 'tipo de vehículo', roles: ADMIN_ROLES },
  zone: { base: '/zones', noun: 'zona', roles: ADMIN_ROLES },
};

export interface EntityTarget {
  href: string;
  label: string;
}

/**
 * Dónde se abre la entidad que tocó un evento: solo si tiene pantalla, la persona puede abrirla y la acción no la eliminó. Los usuarios,
 * invitaciones, empresas y notificaciones no tienen pantalla propia.
 */
export function entityTarget(
  log: Pick<AuditLog, 'action' | 'entityType' | 'entityId'>,
  role: UserRole | null,
  t: TFunction
): EntityTarget | null {
  const target = TARGETS[log.entityType];
  if (!target || !log.entityId || isDeletion(log.action) || role === null || !target.roles.includes(role)) return null;
  return { href: `${target.base}/${encodeURIComponent(log.entityId)}`, label: t('Abrir {0}', [t(target.noun)]) };
}

/** La acción borró la entidad, así que no hay nada que abrir. */
export const entityWasDeleted = (log: Pick<AuditLog, 'action'>): boolean => isDeletion(log.action);

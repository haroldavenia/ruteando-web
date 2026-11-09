import { AuditLog } from '../../core/api/models';
import { ADMIN_ROLES, OPERATIONS_ROLES } from '../../core/auth/admin-roles';
import { UserRole } from '../../core/auth/session.model';
import { t } from '../../core/i18n/i18n';
import { isDeletion } from './audit-labels';

interface Target {
  /** Ruta de la pantalla de la entidad, sin el id. */
  base: string;
  /** Nombre para el enlace («Abrir paquete»). */
  noun: string;
  /** Quienes pueden abrir esa pantalla: las mismas guardas que protegen su ruta. */
  roles: readonly UserRole[];
}

const TARGETS: Readonly<Record<string, Target>> = {
  package: { base: '/paquetes', noun: t('paquete'), roles: OPERATIONS_ROLES },
  journey: { base: '/jornadas', noun: t('jornada'), roles: OPERATIONS_ROLES },
  place: { base: '/lugares', noun: t('lugar'), roles: ADMIN_ROLES },
  settings: { base: '/configuraciones', noun: t('configuración'), roles: ADMIN_ROLES },
  resource: { base: '/flota/vehiculos', noun: t('vehículo'), roles: ADMIN_ROLES },
  resource_type: { base: '/flota/tipos', noun: t('tipo de vehículo'), roles: ADMIN_ROLES },
  'resource-type': { base: '/flota/tipos', noun: t('tipo de vehículo'), roles: ADMIN_ROLES },
  zone: { base: '/zonas', noun: t('zona'), roles: ADMIN_ROLES },
};

export interface EntityTarget {
  commands: string[];
  label: string;
}

/**
 * Dónde se abre la entidad que tocó un evento: solo si tiene pantalla, la persona puede abrirla y la acción no la eliminó.
 * Los usuarios, invitaciones, empresas y notificaciones no tienen pantalla propia.
 */
export function entityTarget(
  log: Pick<AuditLog, 'action' | 'entityType' | 'entityId'>,
  role: UserRole | null
): EntityTarget | null {
  const target = TARGETS[log.entityType];
  if (!target || !log.entityId || isDeletion(log.action) || role === null || !target.roles.includes(role)) {
    return null;
  }
  return { commands: [target.base, log.entityId], label: t('Abrir {0}', [target.noun]) };
}

/** La acción borró la entidad, así que no hay nada que abrir. */
export const entityWasDeleted = (log: Pick<AuditLog, 'action'>): boolean => isDeletion(log.action);

import { UserRole } from '../../core/auth/session.model';
import { t } from '../../core/i18n/i18n';

const LABELS: Readonly<Record<UserRole, string>> = {
  super_admin: t('Superadministrador'),
  tenant_admin: t('Administrador'),
  agent: t('Agente'),
  driver: t('Conductor'),
};

/** Nombre en español del rol de una persona; un rol que no se conoce se muestra tal cual lo da el gateway. */
export function roleLabel(role: string): string {
  return (LABELS as Readonly<Record<string, string>>)[role] ?? role;
}

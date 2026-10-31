import { UserRole } from '../../core/auth/session.model';

const LABELS: Readonly<Record<UserRole, string>> = {
  super_admin: 'Superadministrador',
  tenant_admin: 'Administrador',
  agent: 'Agente',
  driver: 'Conductor',
};

/** Nombre en español del rol de una persona; un rol que no se conoce se muestra tal cual lo da el gateway. */
export function roleLabel(role: string): string {
  return (LABELS as Readonly<Record<string, string>>)[role] ?? role;
}

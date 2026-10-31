import { UserRole } from '../../core/auth/session.model';

/** Qué eventos se consultan: los de la empresa, los de la propia persona o los de todas las empresas. */
export type AuditScopeId = 'empresa' | 'mia' | 'todas';

export interface AuditScope {
  id: AuditScopeId;
  label: string;
}

const SCOPES: Readonly<Record<AuditScopeId, AuditScope>> = {
  empresa: { id: 'empresa', label: 'Mi empresa' },
  mia: { id: 'mia', label: 'Mi actividad' },
  todas: { id: 'todas', label: 'Todas las empresas' },
};

/**
 * Ámbitos que un rol puede consultar, el más amplio primero (es el que se abre). El gateway los limita por endpoint:
 * la empresa es de `tenant_admin`, todas las empresas de `super_admin` y la propia actividad de cualquier sesión.
 */
export function scopesFor(role: UserRole | null): AuditScope[] {
  switch (role) {
    case 'tenant_admin':
      return [SCOPES.empresa, SCOPES.mia];
    case 'super_admin':
      return [SCOPES.todas, SCOPES.mia];
    default:
      return [SCOPES.mia];
  }
}

/** El ámbito pedido si el rol puede consultarlo; si no, el más amplio que le toca. */
export function resolveScope(role: UserRole | null, requested: string | null): AuditScopeId {
  const available = scopesFor(role);
  return available.find((scope) => scope.id === requested)?.id ?? available[0].id;
}

export const auditScopeLabel = (id: AuditScopeId): string => SCOPES[id].label;

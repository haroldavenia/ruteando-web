import type { TFunction } from '@/lib/i18n/core';
import type { UserRole } from '@/lib/session-token';

/** Qué eventos se consultan: los de la empresa, los de la propia persona o los de todas las empresas. */
export type AuditScopeId = 'empresa' | 'mia' | 'todas';

export const auditScopeLabel = (id: AuditScopeId, t: TFunction): string =>
  ({ empresa: t('Mi empresa'), mia: t('Mi actividad'), todas: t('Todas las empresas') })[id];

/**
 * Ámbitos que un rol puede consultar, el más amplio primero (es el que se abre). El gateway los limita por endpoint: la empresa es de
 * `tenant_admin`, todas las empresas de `super_admin` y la propia actividad de cualquier sesión.
 */
export function scopesFor(role: UserRole | null): AuditScopeId[] {
  switch (role) {
    case 'tenant_admin':
      return ['empresa', 'mia'];
    case 'super_admin':
      return ['todas', 'mia'];
    default:
      return ['mia'];
  }
}

/** El ámbito pedido si el rol puede consultarlo; si no, el más amplio que le toca. */
export function resolveScope(role: UserRole | null, requested: string | null): AuditScopeId {
  const available = scopesFor(role);
  return available.find((scope) => scope === requested) ?? available[0]!;
}

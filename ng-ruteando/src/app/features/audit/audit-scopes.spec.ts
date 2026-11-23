import { auditScopeLabel, resolveScope, scopesFor } from './audit-scopes';

describe('audit-scopes', () => {
  it('el administrador de empresa consulta su empresa y su actividad, y abre en la empresa', () => {
    expect(scopesFor('tenant_admin').map((scope) => scope.id)).toEqual(['empresa', 'mia']);
    expect(resolveScope('tenant_admin', null)).toBe('empresa');
  });

  it('el superadministrador consulta todas las empresas y su actividad, y abre en todas', () => {
    expect(scopesFor('super_admin').map((scope) => scope.id)).toEqual(['todas', 'mia']);
    expect(resolveScope('super_admin', null)).toBe('todas');
  });

  it('el agente solo consulta su actividad, sin selector de ámbito', () => {
    expect(scopesFor('agent').map((scope) => scope.id)).toEqual(['mia']);
    expect(resolveScope('agent', null)).toBe('mia');
  });

  it('el conductor y la ausencia de rol solo consultan lo propio', () => {
    expect(scopesFor('driver').map((scope) => scope.id)).toEqual(['mia']);
    expect(scopesFor(null).map((scope) => scope.id)).toEqual(['mia']);
  });

  it('respeta el ámbito pedido si el rol puede consultarlo', () => {
    expect(resolveScope('tenant_admin', 'mia')).toBe('mia');
    expect(resolveScope('super_admin', 'mia')).toBe('mia');
  });

  it('ignora un ámbito que el rol no puede consultar o que no existe', () => {
    expect(resolveScope('agent', 'empresa')).toBe('mia');
    expect(resolveScope('agent', 'todas')).toBe('mia');
    expect(resolveScope('tenant_admin', 'todas')).toBe('empresa');
    expect(resolveScope('super_admin', 'empresa')).toBe('todas');
    expect(resolveScope('tenant_admin', 'inventado')).toBe('empresa');
  });

  it('cada ámbito tiene su nombre', () => {
    expect(auditScopeLabel('empresa')).toBe('Mi empresa');
    expect(auditScopeLabel('mia')).toBe('Mi actividad');
    expect(auditScopeLabel('todas')).toBe('Todas las empresas');
  });
});

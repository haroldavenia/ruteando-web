import { roleLabel } from './role-label';

describe('roleLabel', () => {
  it('da el nombre en español de cada rol', () => {
    expect(roleLabel('super_admin')).toBe('Superadministrador');
    expect(roleLabel('tenant_admin')).toBe('Administrador');
    expect(roleLabel('agent')).toBe('Agente');
    expect(roleLabel('driver')).toBe('Conductor');
  });

  it('un rol desconocido se muestra tal cual, porque el gateway puede añadir otros', () => {
    expect(roleLabel('auditor')).toBe('auditor');
  });
});

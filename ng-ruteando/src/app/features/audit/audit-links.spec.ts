import { auditLog } from '../../../testing/audit';

import { entityTarget, entityWasDeleted } from './audit-links';

describe('audit-links', () => {
  const log = (entityType: string, action = `${entityType}.update`, entityId = 'abc123') => auditLog({ entityType, action, entityId });

  it('los paquetes, jornadas, lugares, configuraciones, vehículos y zonas se abren en su pantalla', () => {
    expect(entityTarget(log('package'), 'tenant_admin')).toEqual({ commands: ['/paquetes', 'abc123'], label: 'Abrir paquete' });
    expect(entityTarget(log('journey'), 'tenant_admin')?.commands).toEqual(['/jornadas', 'abc123']);
    expect(entityTarget(log('place'), 'tenant_admin')?.commands).toEqual(['/lugares', 'abc123']);
    expect(entityTarget(log('settings'), 'tenant_admin')?.commands).toEqual(['/configuraciones', 'abc123']);
    expect(entityTarget(log('resource'), 'tenant_admin')).toEqual({ commands: ['/flota/vehiculos', 'abc123'], label: 'Abrir vehículo' });
    expect(entityTarget(log('zone'), 'tenant_admin')?.commands).toEqual(['/zonas', 'abc123']);
  });

  it('los usuarios, invitaciones, empresas y notificaciones no tienen pantalla propia', () => {
    for (const type of ['user', 'invitation', 'tenant', 'notification']) {
      expect(entityTarget(log(type), 'tenant_admin')).withContext(type).toBeNull();
    }
  });

  it('un tipo que no se conoce no enlaza', () => {
    expect(entityTarget(log('widget'), 'tenant_admin')).toBeNull();
  });

  it('una acción que elimina la entidad no enlaza, y se sabe que fue eliminada', () => {
    const deleted = log('journey', 'journey.delete');
    expect(entityTarget(deleted, 'tenant_admin')).toBeNull();
    expect(entityWasDeleted(deleted)).toBeTrue();
    expect(entityWasDeleted(log('journey', 'journey.update'))).toBeFalse();
  });

  it('un evento sin identificador de entidad no enlaza', () => {
    expect(entityTarget(log('package', 'package.update', ''), 'tenant_admin')).toBeNull();
  });

  it('solo enlaza a lo que el rol puede abrir', () => {
    // El agente trabaja con paquetes y jornadas, pero no con lugares ni flota
    expect(entityTarget(log('package'), 'agent')).not.toBeNull();
    expect(entityTarget(log('journey'), 'agent')).not.toBeNull();
    expect(entityTarget(log('place'), 'agent')).toBeNull();
    expect(entityTarget(log('resource'), 'agent')).toBeNull();
    expect(entityTarget(log('package'), 'driver')).toBeNull();
    expect(entityTarget(log('package'), null)).toBeNull();
  });
});

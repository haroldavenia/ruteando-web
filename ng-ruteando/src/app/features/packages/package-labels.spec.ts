import { OPERATIONS_ROLES } from '../../core/auth/admin-roles';

import {
  formatPackageLocation,
  geocodingStatusLabel,
  packageStatusLabel,
  serviceTypeLabel,
} from './package-labels';

describe('etiquetas de paquetes', () => {
  it('traduce los tipos de servicio', () => {
    expect(serviceTypeLabel('delivery')).toBe('Entrega');
    expect(serviceTypeLabel('pickup')).toBe('Recogida');
    expect(serviceTypeLabel('mixed')).toBe('Mixto');
  });

  it('traduce los estados', () => {
    expect(['pending', 'attended', 'unattended', 'cancelled', 'returned'].map(packageStatusLabel)).toEqual([
      'Pendiente',
      'Atendido',
      'No atendido',
      'Cancelado',
      'Devuelto',
    ]);
  });

  it('traduce los estados de geocodificación como el legacy', () => {
    expect(geocodingStatusLabel('match')).toBe('Ubicada');
    expect(geocodingStatusLabel('mean')).toBe('Aproximada');
    expect(geocodingStatusLabel('manual')).toBe('Manual');
    expect(geocodingStatusLabel('unmatch')).toBe('No ubicada');
  });

  it('un valor desconocido se muestra con su clave y null queda vacío', () => {
    expect(serviceTypeLabel('express')).toBe('express');
    expect(packageStatusLabel('demo_1791043220908')).toBe('demo_1791043220908');
    expect(geocodingStatusLabel(null)).toBe('');
  });

  it('formatea la ubicación con cinco decimales y deja vacía una inválida', () => {
    expect(formatPackageLocation({ location: { type: 'Point', coordinates: [-74.07728, 4.60872] } })).toBe('4,60872 / -74,07728');
    expect(formatPackageLocation({ location: { type: 'Point', coordinates: [300, 4] } })).toBe('');
  });
});

describe('OPERATIONS_ROLES', () => {
  it('incluye administradores y agentes, no conductores', () => {
    expect(OPERATIONS_ROLES).toEqual(['tenant_admin', 'super_admin', 'agent']);
    expect(OPERATIONS_ROLES).not.toContain('driver');
  });
});

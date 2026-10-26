import { UserRole } from '../core/auth/session.model';

import { areaLinksFor, navItemsFor } from './nav-items';

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe('nav-items', () => {
  describe('navItemsFor', () => {
    it('administración ve todas las áreas', () => {
      for (const role of ['tenant_admin', 'super_admin'] as UserRole[]) {
        expect(labels(navItemsFor(role))).toEqual(['Inicio', 'Flota', 'Lugares', 'Zonas', 'Paquetes', 'Jornadas', 'Configuraciones']);
      }
    });

    it('el agente ve Inicio, Paquetes y Jornadas', () => {
      expect(labels(navItemsFor('agent'))).toEqual(['Inicio', 'Paquetes', 'Jornadas']);
    });

    it('el conductor y quien no tiene rol solo ven Inicio', () => {
      expect(labels(navItemsFor('driver'))).toEqual(['Inicio']);
      expect(labels(navItemsFor(null))).toEqual(['Inicio']);
    });
  });

  describe('areaLinksFor', () => {
    it('quita Inicio y aplana Flota en sus tres enlaces', () => {
      expect(labels(areaLinksFor('tenant_admin'))).toEqual([
        'Vehículos',
        'Tipos de vehículo',
        'Conductores',
        'Lugares',
        'Zonas',
        'Paquetes',
        'Jornadas',
        'Configuraciones',
      ]);
    });

    it('cada acceso tiene enlace', () => {
      expect(areaLinksFor('super_admin').every((item) => !!item.link)).toBeTrue();
    });

    it('el agente solo accede a Paquetes y Jornadas y el conductor a nada', () => {
      expect(labels(areaLinksFor('agent'))).toEqual(['Paquetes', 'Jornadas']);
      expect(areaLinksFor('driver')).toEqual([]);
      expect(areaLinksFor(null)).toEqual([]);
    });
  });
});

import { UserRole } from '../core/auth/session.model';

import { NAV_ITEMS, areaLinksFor, navItemsFor, quickActionsFor } from './nav-items';

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe('nav-items', () => {
  describe('navItemsFor', () => {
    it('administración ve todas las áreas', () => {
      for (const role of ['tenant_admin', 'super_admin'] as UserRole[]) {
        expect(labels(navItemsFor(role))).toEqual(['Inicio', 'Flota', 'Lugares', 'Zonas', 'Paquetes', 'Jornadas', 'Configuraciones', 'Auditoría']);
      }
    });

    it('el agente ve Inicio, Paquetes, Jornadas y Auditoría', () => {
      expect(labels(navItemsFor('agent'))).toEqual(['Inicio', 'Paquetes', 'Jornadas', 'Auditoría']);
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
        'Auditoría',
      ]);
    });

    it('cada acceso tiene enlace', () => {
      expect(areaLinksFor('super_admin').every((item) => !!item.link)).toBeTrue();
    });

    it('el agente solo accede a Paquetes y Jornadas y el conductor a nada', () => {
      expect(labels(areaLinksFor('agent'))).toEqual(['Paquetes', 'Jornadas', 'Auditoría']);
      expect(areaLinksFor('driver')).toEqual([]);
      expect(areaLinksFor(null)).toEqual([]);
    });
  });

  describe('nombre corto del riel', () => {
    it('solo Configuraciones lo necesita, y el nombre accesible sigue siendo el largo', () => {
      const withShort = NAV_ITEMS.filter((item) => item.short);
      expect(withShort.map((item) => [item.label, item.short])).toEqual([['Configuraciones', 'Config.']]);
    });
  });

  describe('quickActionsFor', () => {
    it('administración y agentes pueden planificar una jornada, crear un paquete e importar paquetes', () => {
      for (const role of ['tenant_admin', 'super_admin', 'agent'] as UserRole[]) {
        expect(quickActionsFor(role).map((action) => [action.label, action.link])).toEqual([
          ['Planificar jornada', '/jornadas/nueva'],
          ['Nuevo paquete', '/paquetes/nuevo'],
          ['Importar paquetes', '/paquetes/importar'],
        ]);
      }
    });

    it('el conductor y quien no tiene rol no tienen acciones', () => {
      expect(quickActionsFor('driver')).toEqual([]);
      expect(quickActionsFor(null)).toEqual([]);
    });
  });
});

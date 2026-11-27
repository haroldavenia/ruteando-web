// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { EN } from '@/lib/i18n/dictionaries/en';
import { PT } from '@/lib/i18n/dictionaries/pt';
import {
  areaLinksFor,
  isActivePath,
  isGroupActive,
  NAV_ITEMS,
  navItemsFor,
  pageTitleKey,
  QUICK_ACTIONS,
  quickActionsFor,
} from '@/lib/nav-items';
import { displayName, initials } from '@/lib/user-display';

const labels = (role: Parameters<typeof navItemsFor>[0]) => navItemsFor(role).map((item) => item.label);

describe('menú por rol', () => {
  test('el administrador ve todo; el agente solo operaciones; el conductor solo Inicio; sin rol, nada de áreas', () => {
    expect(labels('tenant_admin')).toEqual([
      'Inicio',
      'Flota',
      'Lugares',
      'Zonas',
      'Paquetes',
      'Jornadas',
      'Servicios asignados',
      'Configuraciones',
      'Catálogos',
      'Auditoría',
      'Seguridad',
    ]);
    expect(labels('super_admin')).toEqual(labels('tenant_admin'));
    expect(labels('agent')).toEqual(['Inicio', 'Paquetes', 'Jornadas', 'Servicios asignados', 'Auditoría']);
    expect(labels('driver')).toEqual(['Inicio']);
    expect(labels(null)).toEqual(['Inicio']);
  });

  test('los accesos de Inicio aplanan las secciones y quitan Inicio', () => {
    const admin = areaLinksFor('tenant_admin').map((i) => i.label);
    expect(admin).toContain('Vehículos');
    expect(admin).not.toContain('Flota');
    expect(admin).not.toContain('Inicio');
    expect(areaLinksFor('driver')).toEqual([]);
    expect(areaLinksFor('agent').map((i) => i.link)).toEqual([
      '/packages',
      '/journeys',
      '/assigned-services',
      '/audit',
    ]);
  });

  test('las acciones rápidas son de operaciones', () => {
    expect(quickActionsFor('agent').map((a) => a.link)).toEqual(['/journeys/new', '/packages/new', '/packages/import']);
    expect(quickActionsFor('driver')).toEqual([]);
    expect(quickActionsFor(null)).toEqual([]);
  });

  test('todas las entradas con enlace son rutas internas y tienen icono', () => {
    const all = NAV_ITEMS.flatMap((i) => i.children ?? [i]);
    for (const item of all) {
      expect(item.icon, item.label).toBeTruthy();
      if (item.link) expect(item.link).toMatch(/^\/[a-z-/]*$/);
    }
    for (const action of QUICK_ACTIONS) expect(action.link).toMatch(/^\/[a-z-/]+$/);
  });

  test('cada texto del menú y de las acciones tiene traducción al inglés y al portugués', () => {
    const keys = [
      ...NAV_ITEMS.flatMap((i) => [i, ...(i.children ?? [])]).flatMap((i) => [i.label, i.short]),
      ...QUICK_ACTIONS.map((a) => a.label),
      'Sin permiso',
      'Perfil',
    ].filter((k): k is string => !!k);
    const missing = keys.filter((k) => !EN[k] || !PT[k]);
    expect(missing).toEqual([]);
  });
});

describe('ruta activa', () => {
  const vehicles = { link: '/fleet/vehicles' };

  test('por defecto también en las subrutas, pero no en rutas que solo empiezan igual', () => {
    expect(isActivePath('/fleet/vehicles', vehicles)).toBe(true);
    expect(isActivePath('/fleet/vehicles/12/edit', vehicles)).toBe(true);
    expect(isActivePath('/fleet/vehicles-old', vehicles)).toBe(false);
    expect(isActivePath('/fleet', vehicles)).toBe(false);
  });

  test('exact solo en la ruta exacta (Inicio no se marca en todas partes)', () => {
    expect(isActivePath('/', { link: '/', exact: true })).toBe(true);
    expect(isActivePath('/packages', { link: '/', exact: true })).toBe(false);
  });

  test('una entrada sin enlace nunca está activa; una sección lo está si lo está una hija', () => {
    expect(isActivePath('/x', {})).toBe(false);
    const flota = NAV_ITEMS.find((i) => i.label === 'Flota')!;
    expect(isGroupActive('/fleet/drivers/3', flota)).toBe(true);
    expect(isGroupActive('/places', flota)).toBe(false);
  });
});

describe('título de la barra', () => {
  const items = navItemsFor('tenant_admin');

  test('la entrada del menú que contiene la dirección, con consulta y fragmento', () => {
    expect(pageTitleKey('/', items)).toBe('Inicio');
    expect(pageTitleKey('/fleet/vehicles/12?tab=1#x', items)).toBe('Vehículos');
    expect(pageTitleKey('/journeys/3/routes/1', items)).toBe('Jornadas');
  });

  test('pantallas fuera del menú y rutas desconocidas', () => {
    expect(pageTitleKey('/profile', items)).toBe('Perfil');
    expect(pageTitleKey('/forbidden', items)).toBe('Sin permiso');
    expect(pageTitleKey('/nada', items)).toBe('');
    expect(pageTitleKey('/zones', navItemsFor('agent'))).toBe(''); // el agente no tiene Zonas en el menú
  });
});

describe('nombre e iniciales', () => {
  test('nombre completo, o el correo si no hay nombre', () => {
    expect(displayName({ email: 'a@b.co', firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
    expect(displayName({ email: 'a@b.co', firstName: 'Ada', lastName: null })).toBe('Ada');
    expect(displayName({ email: 'a@b.co', firstName: ' ', lastName: '' })).toBe('a@b.co');
  });

  test('iniciales de nombre y apellido, o de la primera letra del correo', () => {
    expect(initials({ email: 'a@b.co', firstName: 'ada', lastName: 'lovelace' })).toBe('AL');
    expect(initials({ email: 'zoe@b.co', firstName: null, lastName: null })).toBe('Z');
    expect(initials({ email: 'a@b.co', firstName: 'Ada', lastName: undefined })).toBe('A');
    expect(initials({ email: '', firstName: '', lastName: '' })).toBe('?');
  });

  test('un emoji cuenta como un carácter entero (no media pareja sustituta)', () => {
    expect(initials({ email: 'a@b.co', firstName: '🚚 Rápido', lastName: 'Éxito' })).toBe('🚚É');
  });
});

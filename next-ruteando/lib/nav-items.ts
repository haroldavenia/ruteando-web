import {
  type RemixiconComponentType,
  RiAddBoxLine,
  RiBox3Line,
  RiCarLine,
  RiEqualizerLine,
  RiFileUploadLine,
  RiHexagonLine,
  RiHistoryLine,
  RiHome4Line,
  RiListUnordered,
  RiMapPin2Line,
  RiProfileLine,
  RiRoadMapLine,
  RiRouteLine,
  RiShapesLine,
  RiShieldCheckLine,
  RiTaskLine,
  RiTruckLine,
} from '@remixicon/react';

import { ADMIN_ROLES, OPERATIONS_ROLES } from './roles';
import type { UserRole } from './session-token';

/**
 * El menú de la aplicación, por rol. Los textos son las CLAVES en español de `t()`: se traducen al pintarlos (`t(item.label)`), así este
 * módulo sirve igual en servidor y en cliente. El menú es una comodidad: la seguridad la dan el servidor de cada página y el gateway.
 */
export interface NavItem {
  label: string;
  /** Nombre corto para el riel de iconos, donde no cabe el largo (el nombre accesible sigue siendo `label`). */
  short?: string;
  icon: RemixiconComponentType;
  link?: string;
  /** Con `true` solo se marca activa en la ruta exacta; por defecto también en sus subrutas. */
  exact?: boolean;
  /** Roles que la ven; sin `roles`, la ve cualquier persona con sesión. */
  roles?: readonly UserRole[];
  children?: NavItem[];
}

export const HOME_LINK = '/';

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Inicio', icon: RiHome4Line, link: HOME_LINK, exact: true },
  {
    label: 'Flota',
    icon: RiTruckLine,
    roles: ADMIN_ROLES,
    children: [
      { label: 'Vehículos', icon: RiCarLine, link: '/fleet/vehicles' },
      { label: 'Tipos de vehículo', icon: RiShapesLine, link: '/fleet/types' },
      { label: 'Conductores', icon: RiProfileLine, link: '/fleet/drivers' },
    ],
  },
  { label: 'Lugares', icon: RiMapPin2Line, link: '/places', roles: ADMIN_ROLES },
  { label: 'Zonas', icon: RiHexagonLine, link: '/zones', roles: ADMIN_ROLES },
  { label: 'Paquetes', icon: RiBox3Line, link: '/packages', roles: OPERATIONS_ROLES },
  { label: 'Jornadas', icon: RiRouteLine, link: '/journeys', roles: OPERATIONS_ROLES },
  {
    label: 'Servicios asignados',
    short: 'Asignados',
    icon: RiTaskLine,
    link: '/assigned-services',
    roles: OPERATIONS_ROLES,
  },
  { label: 'Configuraciones', short: 'Config.', icon: RiEqualizerLine, link: '/settings', roles: ADMIN_ROLES },
  { label: 'Catálogos', icon: RiListUnordered, link: '/catalogs', roles: ADMIN_ROLES },
  { label: 'Auditoría', icon: RiHistoryLine, link: '/audit', roles: OPERATIONS_ROLES },
  { label: 'Seguridad', icon: RiShieldCheckLine, link: '/security', roles: ADMIN_ROLES },
];

/** Acción rápida de la búsqueda: lleva a una pantalla en la que se empieza algo. */
export interface QuickAction {
  label: string;
  icon: RemixiconComponentType;
  link: string;
  roles: readonly UserRole[];
}

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: 'Planificar jornada', icon: RiRoadMapLine, link: '/journeys/new', roles: OPERATIONS_ROLES },
  { label: 'Nuevo paquete', icon: RiAddBoxLine, link: '/packages/new', roles: OPERATIONS_ROLES },
  { label: 'Importar paquetes', icon: RiFileUploadLine, link: '/packages/import', roles: OPERATIONS_ROLES },
];

/** Acciones rápidas que el rol puede hacer. */
export function quickActionsFor(role: UserRole | null): QuickAction[] {
  return QUICK_ACTIONS.filter((action) => role !== null && action.roles.includes(role));
}

/** Entradas que el rol puede ver. */
export function navItemsFor(role: UserRole | null): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role !== null && item.roles.includes(role)));
}

/** Enlaces de las áreas del rol, sin «Inicio» y con las secciones aplanadas: los accesos de la página de inicio. */
export function areaLinksFor(role: UserRole | null): NavItem[] {
  return navItemsFor(role)
    .filter((item) => item.link !== HOME_LINK)
    .flatMap((item) => item.children ?? [item]);
}

/** ¿Está activa esta entrada en esta ruta? Por defecto también en sus subrutas (`/fleet/vehicles/12` activa «Vehículos»). */
export function isActivePath(pathname: string, item: Pick<NavItem, 'link' | 'exact'>): boolean {
  if (!item.link) return false;
  if (item.exact) return pathname === item.link;
  return pathname === item.link || pathname.startsWith(`${item.link}/`);
}

/** Una sección (Flota) está activa cuando lo está cualquiera de sus entradas. */
export const isGroupActive = (pathname: string, item: NavItem) =>
  (item.children ?? []).some((c) => isActivePath(pathname, c));

/** Clave del título de la barra superior: la entrada del menú cuya ruta contiene la dirección (o una de las pantallas fuera del menú). */
export function pageTitleKey(pathname: string, items: readonly NavItem[]): string {
  const path = pathname.split(/[?#]/)[0];
  if (path === '/forbidden') return 'Sin permiso';
  if (path === '/profile') return 'Perfil';
  const flat = items.flatMap((item) => item.children ?? [item]);
  return flat.find((item) => isActivePath(path, item))?.label ?? '';
}

import { ADMIN_ROLES, OPERATIONS_ROLES } from '../core/auth/admin-roles';
import { UserRole } from '../core/auth/session.model';

/** Entrada del menú: un enlace (`link`) o una sección con enlaces (`children`). */
export interface NavItem {
  label: string;
  /** Nombre corto para el riel de iconos, donde no cabe el largo (el accesible sigue siendo `label`). */
  short?: string;
  icon: string;
  link?: string;
  /** Con `true` solo se marca activa en la ruta exacta; por defecto también en sus subrutas. */
  exact?: boolean;
  /** Roles que la ven; sin `roles`, la ve cualquier persona con sesión (y el render en servidor). */
  roles?: readonly UserRole[];
  children?: NavItem[];
}

export const HOME_LINK = '/';

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Inicio', icon: 'home', link: HOME_LINK, exact: true },
  {
    label: 'Flota',
    icon: 'local_shipping',
    roles: ADMIN_ROLES,
    children: [
      { label: 'Vehículos', icon: 'directions_car', link: '/flota/vehiculos' },
      { label: 'Tipos de vehículo', icon: 'category', link: '/flota/tipos' },
      { label: 'Conductores', icon: 'badge', link: '/flota/conductores' },
    ],
  },
  { label: 'Lugares', icon: 'place', link: '/lugares', roles: ADMIN_ROLES },
  { label: 'Zonas', icon: 'hexagon', link: '/zonas', roles: ADMIN_ROLES },
  { label: 'Paquetes', icon: 'deployed_code', link: '/paquetes', roles: OPERATIONS_ROLES },
  { label: 'Jornadas', icon: 'route', link: '/jornadas', roles: OPERATIONS_ROLES },
  { label: 'Configuraciones', short: 'Config.', icon: 'tune', link: '/configuraciones', roles: ADMIN_ROLES },
  { label: 'Auditoría', icon: 'history', link: '/auditoria', roles: OPERATIONS_ROLES },
];

/** Acción rápida de la búsqueda: lleva a una pantalla en la que se empieza algo. */
export interface QuickAction {
  label: string;
  icon: string;
  link: string;
  roles: readonly UserRole[];
}

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: 'Planificar jornada', icon: 'add_road', link: '/jornadas/nueva', roles: OPERATIONS_ROLES },
  { label: 'Nuevo paquete', icon: 'add_box', link: '/paquetes/nuevo', roles: OPERATIONS_ROLES },
  { label: 'Importar paquetes', icon: 'upload_file', link: '/paquetes/importar', roles: OPERATIONS_ROLES },
];

/** Acciones rápidas que el rol puede hacer (las mismas rutas que ya protegen las guardas). */
export function quickActionsFor(role: UserRole | null): QuickAction[] {
  return QUICK_ACTIONS.filter((action) => role !== null && action.roles.includes(role));
}

/** Entradas que el rol puede ver. El menú es una comodidad: la seguridad la dan las guardas y el gateway. */
export function navItemsFor(role: UserRole | null): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role !== null && item.roles.includes(role)));
}

/** Enlaces de las áreas del rol, sin «Inicio» y con las secciones aplanadas: los accesos de la página de inicio. */
export function areaLinksFor(role: UserRole | null): NavItem[] {
  return navItemsFor(role)
    .filter((item) => item.link !== HOME_LINK)
    .flatMap((item) => item.children ?? [item]);
}

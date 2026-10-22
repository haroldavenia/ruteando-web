import { UserRole } from './session.model';

/**
 * Roles que administran los datos de la empresa (flota, lugares); el gateway ya limita `/users/drivers` a estos mismos. Vive aparte
 * de las rutas para que las rutas de la aplicación no arrastren las rutas de cada feature al bundle inicial.
 */
export const ADMIN_ROLES: readonly UserRole[] = ['tenant_admin', 'super_admin'];

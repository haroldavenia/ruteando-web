import { UserRole } from '../../core/auth/session.model';

/**
 * Roles que administran la flota; el gateway ya limita `/users/drivers` a estos mismos. Vive aparte
 * de las rutas para que las rutas de la aplicación no arrastren `fleet.routes` al bundle inicial.
 */
export const FLEET_ROLES: readonly UserRole[] = ['tenant_admin', 'super_admin'];

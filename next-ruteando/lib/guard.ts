import { redirect } from 'next/navigation';

import { readSession, type UserRole } from './session';
import type { SessionUser } from './session-token';

/**
 * Comprobación de cada página del área privada, en el servidor y con la firma de `rt_user`. El menú y `proxy.ts` son comodidades: esta es
 * la que decide. Sin sesión lleva al acceso; con otro rol, a «Sin permiso».
 */
export async function requireRole(roles: readonly UserRole[]): Promise<SessionUser> {
  const { user } = await readSession();
  if (!user) redirect('/access');
  if (!roles.includes(user.role)) redirect('/forbidden');
  return user;
}

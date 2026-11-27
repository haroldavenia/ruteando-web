import { cookies } from 'next/headers';

import { readConfig } from './config';
import { packUser, type SessionUser, unpackUser } from './session-token';

export { packUser, unpackUser };
export type { SessionUser, UserRole } from './session-token';

export const ACCESS = 'rt_access';
export const REFRESH = 'rt_refresh';
export const USER = 'rt_user';
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

export interface GatewaySession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
}

const base = () => ({ httpOnly: true, sameSite: 'lax' as const, secure: readConfig().cookieSecure, path: '/' });

export async function writeSession(s: GatewaySession) {
  const jar = await cookies();
  jar.set(ACCESS, s.accessToken, { ...base(), maxAge: s.expiresIn });
  jar.set(REFRESH, s.refreshToken, { ...base(), maxAge: REFRESH_MAX_AGE });
  const { id, email, role, tenantId, firstName, lastName } = s.user; // solo lo necesario: sin teléfono ni fechas
  jar.set(USER, packUser({ id, email, role, tenantId, firstName, lastName }), { ...base(), maxAge: REFRESH_MAX_AGE });
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of [ACCESS, REFRESH, USER]) jar.set(name, '', { ...base(), maxAge: 0 });
}

export async function readSession() {
  const jar = await cookies();
  return {
    accessToken: jar.get(ACCESS)?.value,
    refreshToken: jar.get(REFRESH)?.value,
    user: unpackUser(jar.get(USER)?.value),
  };
}

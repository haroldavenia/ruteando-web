import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

import { readConfig } from './config';

export const ACCESS = 'rt_access';
export const REFRESH = 'rt_refresh';
export const USER = 'rt_user';
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

export type UserRole = 'super_admin' | 'tenant_admin' | 'agent' | 'driver';
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  firstName?: string | null;
  lastName?: string | null;
}
export interface GatewaySession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
}

// Sin SESSION_SECRET (solo desarrollo) se usa una clave al azar por proceso: las cookies no sobreviven a un reinicio.
const devSecret = randomBytes(32).toString('hex');
const secret = () => readConfig().sessionSecret || devSecret;
const sign = (v: string) => createHmac('sha256', secret()).update(v).digest('base64url');

/** `rt_user` lleva el perfil firmado: sirve de primera puerta por rol; el gateway sigue siendo quien autoriza. */
export function packUser(user: SessionUser): string {
  const body = Buffer.from(JSON.stringify(user)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function unpackUser(value: string | undefined): SessionUser | null {
  if (!value) return null;
  const [body, mac] = value.split('.');
  if (!body || !mac) return null;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionUser;
  } catch {
    return null;
  }
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

/**
 * Firma de la cookie `rt_user`. Vive aparte de `session.ts` (que usa `next/headers`) para que `proxy.ts` pueda comprobar la firma sin
 * arrastrar el almacén de cookies de los Route Handlers.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { readConfig } from './config';

export type UserRole = 'super_admin' | 'tenant_admin' | 'agent' | 'driver';
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  firstName?: string | null;
  lastName?: string | null;
}

// Solo desarrollo y pruebas: sin SESSION_SECRET se usa una clave al azar por proceso (en `globalThis` para que `proxy.ts` y los Route
// Handlers, que pueden ser módulos distintos, compartan la misma). En producción el arranque falla sin ella (`instrumentation.ts`).
const holder = globalThis as { __rtDevSecret?: string };
function secret(): string {
  const configured = readConfig().sessionSecret;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('Falta SESSION_SECRET');
  return (holder.__rtDevSecret ??= randomBytes(32).toString('hex'));
}
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

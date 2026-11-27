import { jsonError } from './errors';
import { getMfa } from './mfa/service';
import { writeSession, type GatewaySession } from './session';

/**
 * Puerta común de TODA ruta que acaba entregando una sesión nueva (login, verificar el correo, canje del SSO). Falla CERRADO: sin el
 * módulo de segundo factor (MFA_SECRET_KEY) la sesión se entregaría con solo la contraseña o el enlace, así que solo abre con
 * ALLOW_LOGIN_WITHOUT_MFA=true (desarrollo, simulado o un despliegue que decide no usar el 2FA). Devuelve la respuesta de rechazo o `null`.
 */
export function loginGate(): Response | null {
  if (!getMfa().enabled && process.env.ALLOW_LOGIN_WITHOUT_MFA !== 'true') {
    return jsonError(503, 'El acceso no está habilitado todavía.');
  }
  return null;
}

/** Forma mínima que debe tener lo que devuelve el gateway para tratarlo como sesión. */
export const isSession = (v: unknown): v is GatewaySession => {
  const s = v as Partial<GatewaySession> | null;
  return Boolean(s && typeof s.accessToken === 'string' && typeof s.refreshToken === 'string' && s.user?.id);
};

/**
 * Qué hacer con una sesión que el gateway acaba de abrir: si hace falta el segundo factor, la sesión se retiene en el servidor (en el
 * reto) y solo viaja el reto; si no, se convierte en cookies httpOnly. Los tokens nunca van en el JSON.
 */
export async function completeLogin(session: GatewaySession): Promise<Response> {
  const pending = getMfa().afterLogin(session);
  if (pending) return Response.json(pending.json, { status: pending.status });
  await writeSession(session);
  return Response.json({ user: session.user });
}

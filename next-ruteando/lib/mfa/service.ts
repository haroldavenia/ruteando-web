/**
 * Segundo factor de autenticación: el BFF intercepta el login, retiene la sesión del gateway en un reto y solo la entrega (como
 * cookies, nunca como JSON) al superar el reto (correo, SMS o TOTP, o un código de recuperación). Además atiende `/middleware/mfa/**`
 * (altas, política y restablecimientos). Sin `MFA_SECRET_KEY` el módulo queda apagado: el login pasa tal cual y `/mfa/**` responde 503.
 *
 * Portado de server/mfa/index.js sin Express: `handle` recibe la petición y devuelve `{ status, json, session? }`; si trae `session`, el
 * Route Handler la convierte en cookies. Comportamiento y límites idénticos (ver openspec/changes/add-mfa/).
 */
import path from 'node:path';

import { gatewayFetch, GatewayUnavailable } from '../gateway';
import { readCapped } from '../body';
import type { GatewaySession, SessionUser } from '../session';
import { createChallenges, type Challenge } from './challenges';
import { createCodeStore } from './codes';
import { createCrypto, normalizeRecoveryCode, parseMasterKey } from './crypto';
import { codeEmail } from './email-templates';
import { createFailureTracker, createLimiter } from './limits';
import { createMailer, type Mailer } from './mailer';
import { createSms, isValidPhone, maskPhone, type Sms } from './sms';
import { METHODS, openStore, REQUIRED_MODES, type Method, type Policy, type Store } from './store';
import { generateSecret, otpauthUri, verifyTotp } from './totp';

const ISSUER = 'Ruteando';
const ADMIN_ROLES = ['tenant_admin', 'super_admin'];
const KNOWN_ROLES = ['tenant_admin', 'super_admin', 'agent', 'driver'];
const RECOVERY_COUNT = 10;
/** Rutas que admite el reto de activación obligatoria (todas las demás exigen una sesión de verdad). */
const CHALLENGE_ROUTES = new Set(['/status', '/email/setup', '/email/confirm', '/sms/setup', '/sms/confirm', '/totp/setup', '/totp/confirm']);

export interface MfaOut {
  status: number;
  json: unknown;
  /** Sesión del gateway que el Route Handler debe convertir en cookies. */
  session?: GatewaySession;
}
export interface MfaAuth {
  user: SessionUser | null;
  accessToken?: string;
}
export interface MfaOverrides {
  now?: () => number;
  mailer?: Mailer;
  sms?: Sms;
  store?: Store;
  fetchImpl?: typeof fetch;
}

class Fail extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}
const out = (status: number, json: unknown, session?: GatewaySession): MfaOut => ({ status, json, session });
const failOut = (f: Fail): MfaOut => out(f.status, { code: f.code, message: f.message, ...f.extra });

export const maskEmail = (email: unknown) => {
  const [local = '', domain = ''] = String(email || '').split('@');
  return `${local.slice(0, 1)}•••@${domain}`;
};

export function createMfa(env: Record<string, string | undefined> = process.env, overrides: MfaOverrides = {}) {
  const masterKey = parseMasterKey(env.MFA_SECRET_KEY);
  if (!masterKey) {
    return {
      enabled: false as const,
      reason: 'Falta MFA_SECRET_KEY (32 bytes en base64)',
      afterLogin: (_session?: GatewaySession): MfaOut | null => null,
      handle: async (): Promise<MfaOut> => failOut(new Fail(503, 'MFA_DISABLED', 'El segundo factor no está activado en el servidor.')),
    };
  }

  const now = overrides.now || Date.now;
  const codec = createCrypto(masterKey);
  const mailer = overrides.mailer || createMailer(env);
  const sms = overrides.sms || createSms({ env, mailer, codec, now, fetchImpl: overrides.fetchImpl });
  const store =
    overrides.store ||
    openStore(env.MFA_DB_PATH || path.join(process.cwd(), 'data', 'mfa.sqlite'), { now: () => new Date(now()) });
  const codes = createCodeStore({ codec, now });
  const sendLimiter = createLimiter({ now });
  const challenges = createChallenges({ now });
  // Códigos erróneos por PERSONA: los 5 intentos de cada reto no bastan si se pueden abrir retos nuevos sin fin
  const failures = createFailureTracker({ now });
  const available: Record<Method, boolean> = { email: mailer.available, sms: sms.available, totp: true };

  /** Si la persona acumuló demasiados códigos erróneos, lanza el 429. */
  function assertNotLockedOut(user: SessionUser) {
    const state = failures.state(user.id);
    if (state.blocked) {
      throw new Fail(429, 'TOO_MANY_FAILURES', 'Demasiados códigos erróneos. Inténtalo de nuevo en unos minutos.', {
        retryAfterSeconds: Math.ceil(state.retryAfterMs / 1000),
      });
    }
  }

  // ---------- reglas de la política ----------
  const offered = (policy: Policy) => METHODS.filter((m) => policy.methods[m] && available[m]);
  const requiredFor = (policy: Policy, role: string) =>
    policy.required === 'all' || (policy.required === 'roles' && policy.roles.includes(role));
  /** Métodos que la persona tiene verificados y que la empresa permite y el servidor puede usar. */
  function activeMethods(user: SessionUser, policy: Policy): Method[] {
    const verified = new Set(store.getFactors(user.id).filter((f) => f.verified).map((f) => f.type));
    return offered(policy).filter((m) => verified.has(m));
  }
  const destinationOf = (user: SessionUser, method: string) =>
    method === 'email' ? maskEmail(user.email) : method === 'sms' ? maskPhone(store.getFactor(user.id, 'sms')?.destination) : null;

  const event = (user: { id?: string; tenantId?: string } | null, kind: string, detail?: string) =>
    store.addEvent({ userId: user?.id, tenantId: user?.tenantId, kind, detail });

  // ---------- envío y comprobación de códigos ----------
  async function sendCode(user: SessionUser, method: string) {
    const limit = sendLimiter.hit(`${user.id}:${method}`);
    if (!limit.allowed) {
      throw new Fail(429, 'TOO_MANY_REQUESTS', 'Demasiados envíos. Espera unos minutos.', {
        retryAfterSeconds: Math.ceil(limit.retryAfterMs / 1000),
      });
    }
    if (method === 'email') {
      const code = codes.issue(`email:${user.id}`);
      await mailer.send({ to: user.email, ...codeEmail({ code, to: user.email, issuer: ISSUER }) });
    } else {
      await sms.sendCode!(store.getFactor(user.id, 'sms')!.destination!);
    }
  }

  /** Comprueba un código de un método ya activo (o el de recuperación). Gasta los códigos de un solo uso. */
  async function checkCode(user: SessionUser, method: string, code: unknown) {
    const ok = await rawCheck(user, method, code);
    if (ok) failures.clear(user.id);
    else failures.record(user.id);
    return ok;
  }

  async function rawCheck(user: SessionUser, method: string, code: unknown): Promise<boolean> {
    if (method === 'recovery') return store.consumeRecoveryCode(user.id, codec.hash('recovery', normalizeRecoveryCode(code)));
    if (method === 'totp') {
      const factor = store.getFactor(user.id, 'totp');
      if (!factor?.secretEnc) return false;
      const step = verifyTotp(codec.decrypt(factor.secretEnc), code, now(), factor.lastStep);
      if (step == null) return false;
      store.setLastStep(user.id, 'totp', step);
      return true;
    }
    if (method === 'email') return codes.check(`email:${user.id}`, code);
    if (method === 'sms') {
      const factor = store.getFactor(user.id, 'sms');
      return Boolean(factor?.destination) && (await sms.checkCode!(factor!.destination!, code));
    }
    return false;
  }

  function newRecoveryCodes(user: SessionUser) {
    const list = Array.from({ length: RECOVERY_COUNT }, () => codec.recoveryCode());
    store.replaceRecoveryCodes(user.id, list.map((c) => codec.hash('recovery', normalizeRecoveryCode(c))));
    return list;
  }

  // ---------- login ----------
  /**
   * Qué hacer con una sesión que el gateway acaba de abrir (por contraseña o por SSO): `null` si pasa tal cual, o `{ status, json }`
   * con el reto de segundo factor, la activación obligatoria o el bloqueo por demasiados fallos. La sesión se retiene en el reto.
   */
  function afterLogin(session: GatewaySession): MfaOut | null {
    const user = session.user;
    const state = failures.state(user.id);
    if (state.blocked) {
      // la sesión del gateway se descarta: nada llega al navegador
      return failOut(
        new Fail(429, 'TOO_MANY_FAILURES', 'Demasiados códigos erróneos. Inténtalo de nuevo en unos minutos.', {
          retryAfterSeconds: Math.ceil(state.retryAfterMs / 1000),
        })
      );
    }
    const policy = store.getPolicy(user.tenantId);
    const active = activeMethods(user, policy);

    if (active.length > 0) {
      const methods: { method: string; destination: string | null }[] = active.map((method) => ({
        method,
        destination: destinationOf(user, method),
      }));
      if (store.recoveryCodesLeft(user.id) > 0) methods.push({ method: 'recovery', destination: null });
      const c = challenges.create({ session, mode: 'verify', methods: methods.map((m) => m.method) });
      return out(200, { mfaRequired: true, challengeId: c.id, methods, expiresInSeconds: c.expiresInSeconds });
    }
    if (requiredFor(policy, user.role)) {
      const allowed = offered(policy);
      if (allowed.length === 0) {
        return failOut(new Fail(503, 'MFA_UNAVAILABLE', 'El segundo factor es obligatorio pero ningún método está disponible.'));
      }
      const c = challenges.create({ session, mode: 'enroll', methods: allowed });
      return out(200, { mfaEnrollRequired: true, challengeId: c.id, methods: allowed, expiresInSeconds: c.expiresInSeconds });
    }
    return null;
  }

  type Body = Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');

  /** Reto de verificación válido para esta petición, o lanza el error adecuado. */
  function verifyChallenge(body: Body): Challenge {
    const c = challenges.get(body.challengeId);
    if (!c || c.mode !== 'verify') throw new Fail(401, 'CHALLENGE_EXPIRED', 'El reto no es válido o caducó. Inicia sesión de nuevo.');
    if (c.locked) throw new Fail(429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos. Inicia sesión de nuevo.');
    return c;
  }

  function requireAllowed(user: SessionUser, method: Method) {
    if (!store.getPolicy(user.tenantId).methods[method]) throw new Fail(403, 'METHOD_NOT_ALLOWED', 'Tu empresa no permite este método.');
    if (!available[method]) throw new Fail(503, 'METHOD_UNAVAILABLE', 'Este método no está disponible en el servidor.');
  }

  /** Un método ya verificado no se pisa con una activación nueva sin verificar: se desactiva antes, y eso pide un código. */
  const alreadyActive = (what: string) => new Fail(409, 'ALREADY_ACTIVE', `${what} ya está activo. Desactívalo con un código antes de cambiarlo.`);

  /** Si era el primer método activo, genera y devuelve los códigos de recuperación (se muestran una sola vez). */
  function afterEnable(user: SessionUser, method: string) {
    event(user, 'method_enabled', method);
    const verifiedCount = store.getFactors(user.id).filter((f) => f.verified).length;
    return verifiedCount === 1 ? { recoveryCodes: newRecoveryCodes(user) } : {};
  }

  /** Comprueba el código de un método activo (`via`) para autorizar una acción sensible; lanza si falla. */
  async function assertConfirmedByCode(user: SessionUser, body: Body) {
    const via = str(body.via);
    const allowed: string[] = [...activeMethods(user, store.getPolicy(user.tenantId))];
    if (store.recoveryCodesLeft(user.id) > 0) allowed.push('recovery');
    if (!allowed.includes(via)) throw new Fail(400, 'METHOD_UNAVAILABLE', 'Ese método no está disponible.');
    assertNotLockedOut(user);
    if (!(await checkCode(user, via, body.code))) throw new Fail(401, 'INVALID_CODE', 'El código no es válido.');
  }

  /** Empresa sobre la que actúa un administrador: la suya; `super_admin` puede indicar otra con `tenantId`. */
  function targetTenant(user: SessionUser, asked: unknown) {
    if (!asked || asked === user.tenantId) return user.tenantId;
    if (user.role === 'super_admin') return String(asked);
    throw new Fail(403, 'FORBIDDEN', 'No puedes actuar sobre otra empresa.');
  }

  /** Atiende `/middleware/mfa/<path>`. `auth.user` es la sesión de cookies; el reto de activación va en `X-MFA-Challenge`. */
  async function route(request: Request, p: string, auth: MfaAuth): Promise<MfaOut> {
    const method = request.method;
    let body: Body = {};
    if (method !== 'GET' && method !== 'DELETE') {
      const raw = await readCapped(request, 20 * 1024);
      if (raw === null) throw new Fail(400, 'BAD_REQUEST', 'La petición no es válida.');
      try {
        const parsed = raw.byteLength ? JSON.parse(new TextDecoder().decode(raw)) : {};
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed;
      } catch {
        throw new Fail(400, 'BAD_REQUEST', 'La petición no es válida.');
      }
    } else if (method === 'DELETE') {
      // sin cuerpo en DELETE salvo el código: se admite JSON opcional
      const raw = await readCapped(request, 20 * 1024).catch(() => null);
      try {
        if (raw?.byteLength) body = JSON.parse(new TextDecoder().decode(raw));
      } catch {
        throw new Fail(400, 'BAD_REQUEST', 'La petición no es válida.');
      }
    }
    const is = (m: string, route: string) => method === m && p === route;
    const query = new URL(request.url).searchParams;

    // ---- sin sesión: el segundo paso del login ----
    if (is('POST', '/login/send')) {
      const c = verifyChallenge(body);
      const m = str(body.method);
      if (!['email', 'sms'].includes(m) || !c.methods.includes(m)) throw new Fail(400, 'METHOD_UNAVAILABLE', 'Ese método no está disponible.');
      await sendCode(c.user, m);
      return out(200, { sent: true, method: m, destination: destinationOf(c.user, m), expiresInSeconds: 300 });
    }

    if (is('POST', '/login/verify')) {
      const c = verifyChallenge(body);
      const m = str(body.method);
      if (!c.methods.includes(m)) throw new Fail(400, 'METHOD_UNAVAILABLE', 'Ese método no está disponible.');
      assertNotLockedOut(c.user);
      if (!(await checkCode(c.user, m, body.code))) {
        const state = challenges.fail(c.id);
        event(c.user, state.locked ? 'login_locked' : 'login_failed', m);
        throw state.locked
          ? new Fail(429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos. Inicia sesión de nuevo.')
          : new Fail(401, 'INVALID_CODE', 'El código no es válido.', { attemptsLeft: state.attemptsLeft });
      }
      const session = challenges.consume(c.id)!;
      const mfa: Record<string, unknown> = { method: m };
      if (m === 'recovery') {
        event(c.user, 'recovery_used');
        mfa.recoveryCodesLeft = store.recoveryCodesLeft(c.user.id);
      }
      return out(200, { user: session.user, mfa }, session);
    }

    /** Cierra el inicio de sesión de una activación obligatoria cuando ya hay un método activo. */
    if (is('POST', '/login/complete')) {
      const c = challenges.get(body.challengeId);
      if (!c || c.locked || c.mode !== 'enroll') throw new Fail(401, 'CHALLENGE_EXPIRED', 'El reto no es válido o caducó.');
      if (activeMethods(c.user, store.getPolicy(c.user.tenantId)).length === 0) {
        throw new Fail(409, 'ENROLL_PENDING', 'Activa un método antes de entrar.');
      }
      const session = challenges.consume(c.id)!;
      return out(200, { user: session.user, mfa: { method: 'enroll' } }, session);
    }

    // ---- con sesión (o con el reto de activación, solo para dar de alta un método) ----
    let user: SessionUser;
    const challengeId = request.headers.get('x-mfa-challenge');
    if (challengeId) {
      const c = challenges.get(challengeId);
      if (!c || c.locked || c.mode !== 'enroll') throw new Fail(401, 'CHALLENGE_EXPIRED', 'El reto no es válido o caducó.');
      // El reto de activación NO es una sesión: si valiera para la política, los restablecimientos o las bajas, quien solo conoce la
      // contraseña se saltaría el segundo factor que la empresa exige.
      if (!CHALLENGE_ROUTES.has(p)) throw new Fail(403, 'FORBIDDEN', 'Con el reto de activación solo se pueden activar métodos.');
      user = c.user;
    } else {
      if (!auth.user) throw new Fail(401, 'UNAUTHORIZED', 'Hace falta iniciar sesión.');
      user = auth.user;
    }
    const adminOnly = () => {
      if (!ADMIN_ROLES.includes(user.role)) throw new Fail(403, 'FORBIDDEN', 'No tienes permiso para esta acción.');
    };

    /** Estado de cada método para la pantalla de Perfil. */
    if (is('GET', '/status')) {
      const policy = store.getPolicy(user.tenantId);
      const factors = new Map(store.getFactors(user.id).map((f) => [f.type, f]));
      const methods: Record<string, unknown> = {};
      for (const m of METHODS) {
        const f = factors.get(m);
        methods[m] = {
          allowed: policy.methods[m],
          available: available[m],
          active: Boolean(f?.verified),
          pending: Boolean(f && !f.verified),
          destination: m === 'email' ? maskEmail(user.email) : f ? destinationOf(user, m) : null,
        };
      }
      return out(200, {
        enabled: true,
        methods,
        recoveryCodesLeft: store.recoveryCodesLeft(user.id),
        required: requiredFor(policy, user.role),
        activeCount: activeMethods(user, policy).length,
      });
    }

    if (is('POST', '/email/setup')) {
      requireAllowed(user, 'email');
      if (store.getFactor(user.id, 'email')?.verified) throw alreadyActive('El correo');
      store.putFactor({ userId: user.id, tenantId: user.tenantId, type: 'email', destination: user.email, verified: false });
      await sendCode(user, 'email').catch((err) => {
        store.deleteFactor(user.id, 'email');
        throw err;
      });
      return out(200, { sent: true, destination: maskEmail(user.email), expiresInSeconds: 300 });
    }
    if (is('POST', '/email/confirm')) {
      const factor = store.getFactor(user.id, 'email');
      if (!factor || factor.verified) throw new Fail(409, 'NOT_PENDING', 'No hay una activación pendiente.');
      assertNotLockedOut(user);
      if (!(await checkCode(user, 'email', body.code))) throw new Fail(401, 'INVALID_CODE', 'El código no es válido.');
      store.putFactor({ ...factor, verified: true });
      return out(200, { active: true, ...afterEnable(user, 'email') });
    }

    if (is('POST', '/sms/setup')) {
      requireAllowed(user, 'sms');
      if (store.getFactor(user.id, 'sms')?.verified) throw alreadyActive('El SMS');
      const phone = str(body.phone).replace(/[\s()-]/g, '');
      if (!isValidPhone(phone)) {
        throw new Fail(400, 'INVALID_PHONE', 'Escribe el teléfono en formato internacional, por ejemplo +573001234567.');
      }
      const previous = store.getFactor(user.id, 'sms');
      store.putFactor({ userId: user.id, tenantId: user.tenantId, type: 'sms', destination: phone, verified: false });
      await sendCode(user, 'sms').catch((err) => {
        if (previous) store.putFactor(previous);
        else store.deleteFactor(user.id, 'sms');
        throw err;
      });
      return out(200, { sent: true, destination: maskPhone(phone), expiresInSeconds: 300 });
    }
    if (is('POST', '/sms/confirm')) {
      const factor = store.getFactor(user.id, 'sms');
      if (!factor || factor.verified) throw new Fail(409, 'NOT_PENDING', 'No hay una activación pendiente.');
      assertNotLockedOut(user);
      if (!(await checkCode(user, 'sms', body.code))) throw new Fail(401, 'INVALID_CODE', 'El código no es válido.');
      store.putFactor({ ...factor, verified: true });
      return out(200, { active: true, ...afterEnable(user, 'sms') });
    }

    if (is('POST', '/totp/setup')) {
      requireAllowed(user, 'totp');
      if (store.getFactor(user.id, 'totp')?.verified) throw alreadyActive('La aplicación autenticadora');
      const secret = generateSecret();
      store.putFactor({ userId: user.id, tenantId: user.tenantId, type: 'totp', secretEnc: codec.encrypt(secret), verified: false });
      return out(200, { secret, otpauthUri: otpauthUri(ISSUER, user.email, secret) });
    }
    if (is('POST', '/totp/confirm')) {
      const factor = store.getFactor(user.id, 'totp');
      if (!factor || factor.verified) throw new Fail(409, 'NOT_PENDING', 'No hay una activación pendiente.');
      assertNotLockedOut(user);
      const step = verifyTotp(codec.decrypt(factor.secretEnc!), body.code, now(), null);
      if (step == null) {
        failures.record(user.id);
        throw new Fail(401, 'INVALID_CODE', 'El código no es válido.');
      }
      failures.clear(user.id);
      store.putFactor({ ...factor, verified: true, lastStep: step });
      return out(200, { active: true, ...afterEnable(user, 'totp') });
    }

    /** Envía un código a quien ya tiene sesión, para poder confirmar con correo o SMS al desactivar o regenerar. */
    if (is('POST', '/session/send')) {
      const via = str(body.via);
      if (!['email', 'sms'].includes(via) || !(activeMethods(user, store.getPolicy(user.tenantId)) as string[]).includes(via)) {
        throw new Fail(400, 'METHOD_UNAVAILABLE', 'Ese método no está disponible.');
      }
      await sendCode(user, via);
      return out(200, { sent: true, method: via, destination: destinationOf(user, via), expiresInSeconds: 300 });
    }

    if (is('POST', '/recovery-codes/regenerate')) {
      await assertConfirmedByCode(user, body);
      event(user, 'recovery_regenerated');
      return out(200, { recoveryCodes: newRecoveryCodes(user) });
    }

    if (method === 'DELETE' && p.startsWith('/methods/')) {
      const m = p.slice('/methods/'.length);
      if (!(METHODS as readonly string[]).includes(m)) throw new Fail(404, 'NOT_FOUND', 'Método desconocido.');
      const factor = store.getFactor(user.id, m);
      if (!factor) throw new Fail(404, 'NOT_FOUND', 'Ese método no está activado.');
      if (!factor.verified) {
        // Una activación a medias se cancela sin pedir código
        store.deleteFactor(user.id, m);
        return out(200, { active: false });
      }
      const policy = store.getPolicy(user.tenantId);
      if (requiredFor(policy, user.role) && activeMethods(user, policy).filter((x) => x !== m).length === 0) {
        throw new Fail(409, 'LAST_METHOD', 'Tu empresa exige el segundo factor: no puedes quitar el último método.');
      }
      await assertConfirmedByCode(user, body);
      store.deleteFactor(user.id, m);
      if (store.getFactors(user.id).every((f) => !f.verified)) store.replaceRecoveryCodes(user.id, []);
      event(user, 'method_disabled', m);
      return out(200, { active: false });
    }

    // ---- administración ----
    if (is('GET', '/policy')) {
      adminOnly();
      return out(200, { ...store.getPolicy(targetTenant(user, query.get('tenantId'))), available });
    }

    if (is('PUT', '/policy')) {
      adminOnly();
      const tenantId = targetTenant(user, query.get('tenantId') || body.tenantId);
      const m = (body.methods && typeof body.methods === 'object' ? body.methods : {}) as Record<string, unknown>;
      const policy: Policy = {
        tenantId,
        methods: { email: m.email === true, sms: m.sms === true, totp: m.totp === true },
        required: body.required as Policy['required'],
        roles: Array.isArray(body.roles) ? (body.roles as string[]) : [],
      };
      if (!REQUIRED_MODES.includes(policy.required)) throw new Fail(400, 'INVALID_POLICY', 'El modo de obligatoriedad no es válido.');
      if (policy.roles.some((r) => !KNOWN_ROLES.includes(r))) throw new Fail(400, 'INVALID_POLICY', 'Hay un rol desconocido.');
      if (policy.required === 'roles' && policy.roles.length === 0) {
        throw new Fail(400, 'INVALID_POLICY', 'Elige al menos un rol o cambia la obligatoriedad.');
      }
      if (policy.required !== 'roles') policy.roles = [];
      if (policy.required !== 'none' && !METHODS.some((x) => policy.methods[x])) {
        throw new Fail(400, 'NO_METHOD_ALLOWED', 'Para exigir el segundo factor hace falta permitir al menos un método.');
      }
      store.setPolicy(policy);
      event(user, 'policy_changed', policy.required);
      return out(200, { ...policy, available });
    }

    /** Quién tiene al menos un método activo en la empresa (para marcarlo en la lista de personas). */
    if (is('GET', '/users')) {
      adminOnly();
      return out(200, { userIds: store.usersWithFactors(targetTenant(user, query.get('tenantId'))) });
    }

    const reset = /^\/users\/([^/]+)\/reset$/.exec(p);
    if (method === 'POST' && reset) {
      adminOnly();
      const res = await gatewayFetch(`/users/${encodeURIComponent(reset[1])}`, { token: auth.accessToken });
      const target = res.status === 200 ? ((await res.json().catch(() => null)) as { id?: string; tenantId?: string } | null) : null;
      // La persona debe existir para quien llama (el gateway ya limita lo que ve) y ser de su empresa, salvo `super_admin`
      if (!target?.id) throw new Fail(404, 'NOT_FOUND', 'No se encontró a esa persona.');
      if (user.role !== 'super_admin' && target.tenantId !== user.tenantId) {
        throw new Fail(403, 'FORBIDDEN', 'No puedes actuar sobre otra empresa.');
      }
      store.resetUser(target.id);
      event({ id: target.id, tenantId: target.tenantId }, 'user_reset', `por ${user.id}`);
      return out(200, { reset: true });
    }

    throw new Fail(404, 'NOT_FOUND', 'Not found');
  }

  return {
    enabled: true as const,
    codec,
    store,
    challenges,
    afterLogin,
    async handle(request: Request, p: string, auth: MfaAuth): Promise<MfaOut> {
      try {
        return await route(request, p, auth);
      } catch (err) {
        if (err instanceof Fail) return failOut(err);
        if (err instanceof GatewayUnavailable) return failOut(new Fail(err.status, 'GATEWAY_ERROR', 'El servicio no está disponible.'));
        // Mensaje genérico: ni el SMTP, ni Twilio, ni nada interno llegan al navegador
        console.error('[mfa]', err instanceof Error ? err.message : err);
        return failOut(new Fail(500, 'MFA_ERROR', 'No se pudo completar la operación.'));
      }
    },
  };
}

export type Mfa = ReturnType<typeof createMfa>;

let instance: Mfa | undefined;
/** Una instancia por proceso: los retos y los límites viven en memoria (una sola réplica). */
export function getMfa(): Mfa {
  return (instance ??= createMfa());
}
export const resetMfaForTests = () => void (instance = undefined);

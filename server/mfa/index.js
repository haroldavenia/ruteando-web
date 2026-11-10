/**
 * Segundo factor de autenticación (change add-mfa): el servidor intercepta `POST /gateway/auth/login`, retiene los tokens y solo los
 * entrega al superar el reto (correo, SMS o TOTP, o un código de recuperación). Además atiende `/mfa/**` (altas, política y
 * restablecimientos). Sin `MFA_SECRET_KEY` el módulo queda apagado: el login pasa tal cual y `/mfa/**` responde 503.
 *
 * `createMfa(env, overrides)` devuelve `{ enabled, mount(app) }`; `overrides` (reloj, fetch, correo, SMS, almacén) existe para las
 * pruebas. Ver openspec/changes/add-mfa/ (spec two-factor-authentication) para el comportamiento.
 */
const path = require('node:path');
const express = require('express');
const { createChallenges } = require('./challenges');
const { createCodeStore } = require('./codes');
const { createCrypto, normalizeRecoveryCode, parseMasterKey } = require('./crypto');
const { createGatewayClient, GatewayError } = require('./gateway');
const { createLimiter } = require('./limits');
const { createMailer } = require('./mailer');
const { createSms, isValidPhone, maskPhone } = require('./sms');
const { openStore, REQUIRED_MODES } = require('./store');
const { generateSecret, otpauthUri, verifyTotp } = require('./totp');

const ISSUER = 'Ruteando';
const ADMIN_ROLES = ['tenant_admin', 'super_admin'];
const KNOWN_ROLES = ['tenant_admin', 'super_admin', 'agent', 'driver'];
const SESSION_METHODS = ['email', 'sms', 'totp'];
const RECOVERY_COUNT = 10;

function maskEmail(email) {
  const [local = '', domain = ''] = String(email || '').split('@');
  return `${local.slice(0, 1)}•••@${domain}`;
}

function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ code, message, ...extra });
}

function createMfa(env = process.env, overrides = {}) {
  const masterKey = parseMasterKey(env.MFA_SECRET_KEY);
  if (!masterKey) {
    return {
      enabled: false,
      reason: 'Falta MFA_SECRET_KEY (32 bytes en base64)',
      mount(app) {
        app.use('/gateway/mfa', (req, res) =>
          fail(res, 503, 'MFA_DISABLED', 'El segundo factor no está activado en el servidor.')
        );
      },
    };
  }

  const now = overrides.now || Date.now;
  const codec = createCrypto(masterKey);
  const gateway = overrides.gateway || createGatewayClient(env, overrides.fetchImpl);
  const mailer = overrides.mailer || createMailer(env);
  const sms = overrides.sms || createSms({ env, mailer, codec, now, fetchImpl: overrides.fetchImpl });
  const store =
    overrides.store ||
    openStore(env.MFA_DB_PATH || path.join(__dirname, '..', '..', 'data', 'mfa.sqlite'), {
      now: () => new Date(now()),
    });
  const codes = createCodeStore({ codec, now });
  const sendLimiter = createLimiter({ now });
  const challenges = createChallenges({ now });
  const available = { email: mailer.available, sms: sms.available, totp: true };

  // ---------- reglas de la política ----------
  const offered = (policy) => SESSION_METHODS.filter((m) => policy.methods[m] && available[m]);
  const requiredFor = (policy, role) =>
    policy.required === 'all' || (policy.required === 'roles' && policy.roles.includes(role));
  /** Métodos que la persona tiene verificados y que la empresa permite y el servidor puede usar. */
  function activeMethods(user, policy) {
    const verified = new Set(
      store
        .getFactors(user.id)
        .filter((f) => f.verified)
        .map((f) => f.type)
    );
    return offered(policy).filter((m) => verified.has(m));
  }
  const destinationOf = (user, method) =>
    method === 'email'
      ? maskEmail(user.email)
      : method === 'sms'
        ? maskPhone(store.getFactor(user.id, 'sms')?.destination)
        : null;

  function event(user, kind, detail) {
    store.addEvent({ userId: user?.id, tenantId: user?.tenantId, kind, detail });
  }

  // ---------- envío y comprobación de códigos ----------
  async function sendCode(user, method) {
    const limit = sendLimiter.hit(`${user.id}:${method}`);
    if (!limit.allowed) {
      const err = new Error('Demasiados envíos');
      err.status = 429;
      err.retryAfterMs = limit.retryAfterMs;
      throw err;
    }
    if (method === 'email') {
      const code = codes.issue(`email:${user.id}`);
      await mailer.send({
        to: user.email,
        subject: 'Tu código de verificación',
        text: `Tu código de verificación de ${ISSUER} es ${code}. Caduca en 5 minutos. Si no lo pediste, ignora este mensaje.`,
      });
    } else {
      const factor = store.getFactor(user.id, 'sms');
      await sms.sendCode(factor.destination);
    }
  }

  /** Comprueba un código de un método ya activo (o el de recuperación). Gasta los códigos de un solo uso. */
  async function checkCode(user, method, code) {
    if (method === 'recovery') {
      return store.consumeRecoveryCode(user.id, codec.hash('recovery', normalizeRecoveryCode(code)));
    }
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
      return Boolean(factor?.destination) && (await sms.checkCode(factor.destination, code));
    }
    return false;
  }

  function newRecoveryCodes(user) {
    const list = Array.from({ length: RECOVERY_COUNT }, () => codec.recoveryCode());
    store.replaceRecoveryCodes(
      user.id,
      list.map((c) => codec.hash('recovery', normalizeRecoveryCode(c)))
    );
    return list;
  }

  // ---------- autenticación de las rutas /mfa ----------
  /** Con `Authorization: Bearer` se valida contra el gateway (`/auth/me`); con `X-MFA-Challenge`, el reto de activación obligatoria. */
  async function authenticate(req, res, next) {
    try {
      const challengeId = req.get('x-mfa-challenge');
      if (challengeId) {
        const c = challenges.get(challengeId);
        if (!c || c.locked || c.mode !== 'enroll')
          return fail(res, 401, 'CHALLENGE_EXPIRED', 'El reto no es válido o caducó.');
        req.mfaUser = c.user;
        req.viaChallenge = c.id;
        return next();
      }
      const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!token) return fail(res, 401, 'UNAUTHORIZED', 'Hace falta iniciar sesión.');
      const me = await gateway.call('GET', '/auth/me', { token });
      if (me.status !== 200 || !me.json?.id) return fail(res, 401, 'UNAUTHORIZED', 'La sesión no es válida.');
      req.mfaUser = me.json;
      return next();
    } catch (err) {
      return handleError(res, err);
    }
  }
  const adminOnly = (req, res, next) =>
    ADMIN_ROLES.includes(req.mfaUser.role)
      ? next()
      : fail(res, 403, 'FORBIDDEN', 'No tienes permiso para esta acción.');

  /** Empresa sobre la que actúa un administrador: la suya; `super_admin` puede indicar otra con `tenantId`. */
  function targetTenant(req, res) {
    const asked = req.query.tenantId || req.body?.tenantId;
    if (!asked || asked === req.mfaUser.tenantId) return req.mfaUser.tenantId;
    if (req.mfaUser.role === 'super_admin') return String(asked);
    fail(res, 403, 'FORBIDDEN', 'No puedes actuar sobre otra empresa.');
    return null;
  }

  function handleError(res, err) {
    if (err instanceof GatewayError) return fail(res, err.status, 'GATEWAY_ERROR', err.message);
    if (err?.status === 429) {
      return fail(res, 429, 'TOO_MANY_REQUESTS', 'Demasiados envíos. Espera unos minutos.', {
        retryAfterSeconds: Math.ceil((err.retryAfterMs || 0) / 1000),
      });
    }
    // Mensaje genérico: ni el SMTP, ni Twilio, ni nada interno llegan al navegador
    console.error('[mfa]', err?.message || err);
    return fail(res, 500, 'MFA_ERROR', 'No se pudo completar la operación.');
  }
  const wrap = (fn) => (req, res) => fn(req, res).catch((err) => handleError(res, err));

  // ---------- login ----------
  const loginHandler = wrap(async (req, res) => {
    const out = await gateway.call('POST', '/auth/login', { body: req.body });
    const session = out.json;
    if (out.status !== 200 || !session?.user?.id || !session.accessToken) {
      // Credenciales incorrectas u otro error: la respuesta del gateway, sin tocarla
      return res.status(out.status).type(out.contentType).send(out.text);
    }
    const user = session.user;
    const policy = store.getPolicy(user.tenantId);
    const active = activeMethods(user, policy);

    if (active.length > 0) {
      const methods = active.map((method) => ({ method, destination: destinationOf(user, method) }));
      if (store.recoveryCodesLeft(user.id) > 0) methods.push({ method: 'recovery', destination: null });
      const c = challenges.create({ session, mode: 'verify', methods: methods.map((m) => m.method) });
      return res.json({ mfaRequired: true, challengeId: c.id, methods, expiresInSeconds: c.expiresInSeconds });
    }
    if (requiredFor(policy, user.role)) {
      const allowed = offered(policy);
      if (allowed.length === 0) {
        return fail(
          res,
          503,
          'MFA_UNAVAILABLE',
          'El segundo factor es obligatorio pero ningún método está disponible.'
        );
      }
      const c = challenges.create({ session, mode: 'enroll', methods: allowed });
      return res.json({
        mfaEnrollRequired: true,
        challengeId: c.id,
        methods: allowed,
        expiresInSeconds: c.expiresInSeconds,
      });
    }
    return res.status(200).type(out.contentType).send(out.text);
  });

  const router = express.Router();
  router.use(express.json({ limit: '20kb' }));

  /** Reto de verificación válido para esta petición, o responde el error adecuado y devuelve `null`. */
  function verifyChallenge(req, res) {
    const c = challenges.get(req.body?.challengeId);
    if (!c || c.mode !== 'verify') {
      fail(res, 401, 'CHALLENGE_EXPIRED', 'El reto no es válido o caducó. Inicia sesión de nuevo.');
      return null;
    }
    if (c.locked) {
      fail(res, 429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos. Inicia sesión de nuevo.');
      return null;
    }
    return c;
  }

  router.post(
    '/login/send',
    wrap(async (req, res) => {
      const c = verifyChallenge(req, res);
      if (!c) return;
      const method = req.body?.method;
      if (!['email', 'sms'].includes(method) || !c.methods.includes(method)) {
        return fail(res, 400, 'METHOD_UNAVAILABLE', 'Ese método no está disponible.');
      }
      await sendCode(c.user, method);
      res.json({ sent: true, method, destination: destinationOf(c.user, method), expiresInSeconds: 300 });
    })
  );

  router.post(
    '/login/verify',
    wrap(async (req, res) => {
      const c = verifyChallenge(req, res);
      if (!c) return;
      const method = req.body?.method;
      if (!c.methods.includes(method)) return fail(res, 400, 'METHOD_UNAVAILABLE', 'Ese método no está disponible.');
      const ok = await checkCode(c.user, method, req.body?.code);
      if (!ok) {
        const state = challenges.fail(c.id);
        event(c.user, state.locked ? 'login_locked' : 'login_failed', method);
        return state.locked
          ? fail(res, 429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos. Inicia sesión de nuevo.')
          : fail(res, 401, 'INVALID_CODE', 'El código no es válido.', { attemptsLeft: state.attemptsLeft });
      }
      const session = challenges.consume(c.id);
      const body = { ...session };
      if (method === 'recovery') {
        event(c.user, 'recovery_used');
        body.mfa = { method, recoveryCodesLeft: store.recoveryCodesLeft(c.user.id) };
      } else {
        body.mfa = { method };
      }
      res.json(body);
    })
  );

  /** Cierra el inicio de sesión de una activación obligatoria cuando ya hay un método activo. */
  router.post(
    '/login/complete',
    wrap(async (req, res) => {
      const c = challenges.get(req.body?.challengeId);
      if (!c || c.locked || c.mode !== 'enroll')
        return fail(res, 401, 'CHALLENGE_EXPIRED', 'El reto no es válido o caducó.');
      if (activeMethods(c.user, store.getPolicy(c.user.tenantId)).length === 0) {
        return fail(res, 409, 'ENROLL_PENDING', 'Activa un método antes de entrar.');
      }
      res.json({ ...challenges.consume(c.id), mfa: { method: 'enroll' } });
    })
  );

  // ---------- gestión de la propia persona ----------
  router.use(authenticate);

  /** Estado de cada método para la pantalla de Perfil. */
  router.get('/status', (req, res) => {
    const user = req.mfaUser;
    const policy = store.getPolicy(user.tenantId);
    const factors = new Map(store.getFactors(user.id).map((f) => [f.type, f]));
    const methods = {};
    for (const m of SESSION_METHODS) {
      const f = factors.get(m);
      methods[m] = {
        allowed: policy.methods[m],
        available: available[m],
        active: Boolean(f?.verified),
        pending: Boolean(f && !f.verified),
        destination: m === 'email' ? maskEmail(user.email) : f ? destinationOf(user, m) : null,
      };
    }
    res.json({
      enabled: true,
      methods,
      recoveryCodesLeft: store.recoveryCodesLeft(user.id),
      required: requiredFor(policy, user.role),
      activeCount: activeMethods(user, policy).length,
    });
  });

  const requireAllowed = (user, method, res) => {
    const policy = store.getPolicy(user.tenantId);
    if (!policy.methods[method]) return fail(res, 403, 'METHOD_NOT_ALLOWED', 'Tu empresa no permite este método.');
    if (!available[method])
      return fail(res, 503, 'METHOD_UNAVAILABLE', 'Este método no está disponible en el servidor.');
    return null;
  };

  /** Un método ya verificado no se pisa con una activación nueva sin verificar: se desactiva antes, y eso pide un código. */
  const alreadyActive = (res, what) =>
    fail(res, 409, 'ALREADY_ACTIVE', `${what} ya está activo. Desactívalo con un código antes de cambiarlo.`);

  /** Si era el primer método activo, genera y devuelve los códigos de recuperación (se muestran una sola vez). */
  function afterEnable(user, method) {
    event(user, 'method_enabled', method);
    const verifiedCount = store.getFactors(user.id).filter((f) => f.verified).length;
    return verifiedCount === 1 ? { recoveryCodes: newRecoveryCodes(user) } : {};
  }

  router.post(
    '/email/setup',
    wrap(async (req, res) => {
      const user = req.mfaUser;
      if (requireAllowed(user, 'email', res)) return;
      if (store.getFactor(user.id, 'email')?.verified) return alreadyActive(res, 'El correo');
      store.putFactor({
        userId: user.id,
        tenantId: user.tenantId,
        type: 'email',
        destination: user.email,
        verified: false,
      });
      await sendCode(user, 'email').catch((err) => {
        store.deleteFactor(user.id, 'email');
        throw err;
      });
      res.json({ sent: true, destination: maskEmail(user.email), expiresInSeconds: 300 });
    })
  );
  router.post(
    '/email/confirm',
    wrap(async (req, res) => {
      const user = req.mfaUser;
      const factor = store.getFactor(user.id, 'email');
      if (!factor || factor.verified) return fail(res, 409, 'NOT_PENDING', 'No hay una activación pendiente.');
      if (!(await checkCode(user, 'email', req.body?.code)))
        return fail(res, 401, 'INVALID_CODE', 'El código no es válido.');
      store.putFactor({ ...factor, verified: true });
      res.json({ active: true, ...afterEnable(user, 'email') });
    })
  );

  router.post(
    '/sms/setup',
    wrap(async (req, res) => {
      const user = req.mfaUser;
      if (requireAllowed(user, 'sms', res)) return;
      if (store.getFactor(user.id, 'sms')?.verified) return alreadyActive(res, 'El SMS');
      const phone = String(req.body?.phone || '').replace(/[\s()-]/g, '');
      if (!isValidPhone(phone)) {
        return fail(
          res,
          400,
          'INVALID_PHONE',
          'Escribe el teléfono en formato internacional, por ejemplo +573001234567.'
        );
      }
      const previous = store.getFactor(user.id, 'sms');
      store.putFactor({ userId: user.id, tenantId: user.tenantId, type: 'sms', destination: phone, verified: false });
      await sendCode(user, 'sms').catch((err) => {
        if (previous) store.putFactor(previous);
        else store.deleteFactor(user.id, 'sms');
        throw err;
      });
      res.json({ sent: true, destination: maskPhone(phone), expiresInSeconds: 300 });
    })
  );
  router.post(
    '/sms/confirm',
    wrap(async (req, res) => {
      const user = req.mfaUser;
      const factor = store.getFactor(user.id, 'sms');
      if (!factor || factor.verified) return fail(res, 409, 'NOT_PENDING', 'No hay una activación pendiente.');
      if (!(await checkCode(user, 'sms', req.body?.code)))
        return fail(res, 401, 'INVALID_CODE', 'El código no es válido.');
      store.putFactor({ ...factor, verified: true });
      res.json({ active: true, ...afterEnable(user, 'sms') });
    })
  );

  router.post(
    '/totp/setup',
    wrap(async (req, res) => {
      const user = req.mfaUser;
      if (requireAllowed(user, 'totp', res)) return;
      if (store.getFactor(user.id, 'totp')?.verified) return alreadyActive(res, 'La aplicación autenticadora');
      const secret = generateSecret();
      store.putFactor({
        userId: user.id,
        tenantId: user.tenantId,
        type: 'totp',
        secretEnc: codec.encrypt(secret),
        verified: false,
      });
      res.json({ secret, otpauthUri: otpauthUri(ISSUER, user.email, secret) });
    })
  );
  router.post(
    '/totp/confirm',
    wrap(async (req, res) => {
      const user = req.mfaUser;
      const factor = store.getFactor(user.id, 'totp');
      if (!factor || factor.verified) return fail(res, 409, 'NOT_PENDING', 'No hay una activación pendiente.');
      const step = verifyTotp(codec.decrypt(factor.secretEnc), req.body?.code, now(), null);
      if (step == null) return fail(res, 401, 'INVALID_CODE', 'El código no es válido.');
      store.putFactor({ ...factor, verified: true, lastStep: step });
      res.json({ active: true, ...afterEnable(user, 'totp') });
    })
  );

  /** Envía un código a quien ya tiene sesión, para poder confirmar con correo o SMS al desactivar o regenerar. */
  router.post(
    '/session/send',
    wrap(async (req, res) => {
      const user = req.mfaUser;
      const method = req.body?.via;
      if (!['email', 'sms'].includes(method) || !activeMethods(user, store.getPolicy(user.tenantId)).includes(method)) {
        return fail(res, 400, 'METHOD_UNAVAILABLE', 'Ese método no está disponible.');
      }
      await sendCode(user, method);
      res.json({ sent: true, method, destination: destinationOf(user, method), expiresInSeconds: 300 });
    })
  );

  /** Comprueba el código de un método activo (`via`) para autorizar una acción sensible; responde y devuelve `false` si falla. */
  async function confirmedByCode(req, res) {
    const user = req.mfaUser;
    const via = req.body?.via;
    const allowed = [...activeMethods(user, store.getPolicy(user.tenantId))];
    if (store.recoveryCodesLeft(user.id) > 0) allowed.push('recovery');
    if (!allowed.includes(via)) {
      fail(res, 400, 'METHOD_UNAVAILABLE', 'Ese método no está disponible.');
      return false;
    }
    if (!(await checkCode(user, via, req.body?.code))) {
      fail(res, 401, 'INVALID_CODE', 'El código no es válido.');
      return false;
    }
    return true;
  }

  router.post(
    '/recovery-codes/regenerate',
    wrap(async (req, res) => {
      if (!(await confirmedByCode(req, res))) return;
      event(req.mfaUser, 'recovery_regenerated');
      res.json({ recoveryCodes: newRecoveryCodes(req.mfaUser) });
    })
  );

  router.delete(
    '/methods/:method',
    wrap(async (req, res) => {
      const user = req.mfaUser;
      const method = req.params.method;
      if (!SESSION_METHODS.includes(method)) return fail(res, 404, 'NOT_FOUND', 'Método desconocido.');
      const factor = store.getFactor(user.id, method);
      if (!factor) return fail(res, 404, 'NOT_FOUND', 'Ese método no está activado.');
      if (!factor.verified) {
        // Una activación a medias se cancela sin pedir código
        store.deleteFactor(user.id, method);
        return res.json({ active: false });
      }
      const policy = store.getPolicy(user.tenantId);
      if (requiredFor(policy, user.role) && activeMethods(user, policy).filter((m) => m !== method).length === 0) {
        return fail(res, 409, 'LAST_METHOD', 'Tu empresa exige el segundo factor: no puedes quitar el último método.');
      }
      if (!(await confirmedByCode(req, res))) return;
      store.deleteFactor(user.id, method);
      if (store.getFactors(user.id).every((f) => !f.verified)) store.replaceRecoveryCodes(user.id, []);
      event(user, 'method_disabled', method);
      res.json({ active: false });
    })
  );

  // ---------- administración ----------
  router.get('/policy', adminOnly, (req, res) => {
    const tenantId = targetTenant(req, res);
    if (tenantId) res.json({ ...store.getPolicy(tenantId), available });
  });

  router.put('/policy', adminOnly, (req, res) => {
    const tenantId = targetTenant(req, res);
    if (!tenantId) return;
    const b = req.body || {};
    const methods = b.methods || {};
    const policy = {
      tenantId,
      methods: { email: methods.email === true, sms: methods.sms === true, totp: methods.totp === true },
      required: b.required,
      roles: Array.isArray(b.roles) ? b.roles : [],
    };
    if (!REQUIRED_MODES.includes(policy.required))
      return fail(res, 400, 'INVALID_POLICY', 'El modo de obligatoriedad no es válido.');
    if (policy.roles.some((r) => !KNOWN_ROLES.includes(r)))
      return fail(res, 400, 'INVALID_POLICY', 'Hay un rol desconocido.');
    if (policy.required === 'roles' && policy.roles.length === 0) {
      return fail(res, 400, 'INVALID_POLICY', 'Elige al menos un rol o cambia la obligatoriedad.');
    }
    if (policy.required !== 'roles') policy.roles = [];
    if (policy.required !== 'none' && !SESSION_METHODS.some((m) => policy.methods[m])) {
      return fail(
        res,
        400,
        'NO_METHOD_ALLOWED',
        'Para exigir el segundo factor hace falta permitir al menos un método.'
      );
    }
    store.setPolicy(policy);
    event(req.mfaUser, 'policy_changed', policy.required);
    res.json({ ...policy, available });
  });

  /** Quién tiene al menos un método activo en la empresa (para marcarlo en la lista de personas). */
  router.get('/users', adminOnly, (req, res) => {
    const tenantId = targetTenant(req, res);
    if (tenantId) res.json({ userIds: store.usersWithFactors(tenantId) });
  });

  router.post(
    '/users/:id/reset',
    adminOnly,
    wrap(async (req, res) => {
      const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
      const target = await gateway.call('GET', `/users/${encodeURIComponent(req.params.id)}`, { token });
      // La persona debe existir para quien llama (el gateway ya limita lo que ve) y ser de su empresa, salvo `super_admin`
      if (target.status !== 200 || !target.json?.id)
        return fail(res, 404, 'NOT_FOUND', 'No se encontró a esa persona.');
      if (req.mfaUser.role !== 'super_admin' && target.json.tenantId !== req.mfaUser.tenantId) {
        return fail(res, 403, 'FORBIDDEN', 'No puedes actuar sobre otra empresa.');
      }
      store.resetUser(target.json.id);
      event({ id: target.json.id, tenantId: target.json.tenantId }, 'user_reset', `por ${req.mfaUser.id}`);
      res.json({ reset: true });
    })
  );

  router.use((req, res) => fail(res, 404, 'NOT_FOUND', 'Not found'));
  router.use((err, req, res, next) => {
    // JSON mal formado o demasiado grande
    if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
      return fail(res, 400, 'BAD_REQUEST', 'La petición no es válida.');
    }
    return handleError(res, err);
  });

  return {
    enabled: true,
    codec,
    store,
    challenges,
    /** Registra el login interceptado y `/mfa` en la aplicación; debe ir ANTES del proxy de `/gateway`. */
    mount(app) {
      app.post('/gateway/auth/login', express.json({ limit: '20kb' }), loginHandler, (err, req, res, next) =>
        fail(res, 400, 'BAD_REQUEST', 'La petición no es válida.')
      );
      app.use('/gateway/mfa', router);
    },
  };
}

module.exports = { createMfa };

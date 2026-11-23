/**
 * Retos de segundo factor en memoria. Un reto guarda la sesión del gateway (tokens incluidos) entre la contraseña y el código:
 * nunca va a disco ni al registro, caduca a los 5 minutos y se pierde al reiniciar el servidor (hay que iniciar sesión de nuevo).
 * Una sola instancia del servidor (con varias, el reto debería vivir en un almacén compartido).
 */
const crypto = require('node:crypto');
const { MAX_ATTEMPTS } = require('./limits');

const TTL_MS = 5 * 60 * 1000;

function createChallenges({ now = Date.now, ttlMs = TTL_MS, maxAttempts = MAX_ATTEMPTS } = {}) {
  const items = new Map();

  function sweep() {
    const t = now();
    for (const [id, c] of items) if (c.expiresAt <= t) items.delete(id);
  }

  return {
    /** `mode`: `verify` (hay métodos activos que superar) o `enroll` (la política exige activar uno). */
    create({ session, mode, methods }) {
      sweep();
      const id = crypto.randomBytes(24).toString('base64url');
      items.set(id, { id, session, user: session.user, mode, methods, attempts: 0, expiresAt: now() + ttlMs });
      return { id, expiresInSeconds: Math.round(ttlMs / 1000) };
    },
    /** El reto vigente (con `locked: true` si agotó los intentos) o `null` si no existe o caducó. */
    get(id) {
      const c = items.get(String(id || ''));
      if (!c) return null;
      if (c.expiresAt <= now()) {
        items.delete(c.id);
        return null;
      }
      return c;
    },
    /** Cuenta un fallo; al llegar al máximo el reto se bloquea y devuelve `locked: true`. */
    fail(id) {
      const c = items.get(String(id || ''));
      if (!c) return { locked: true };
      c.attempts += 1;
      if (c.attempts >= maxAttempts) {
        // Queda como lápida hasta que caduque: las siguientes verificaciones responden 429, no «reto desconocido»
        c.locked = true;
        c.session = null;
        return { locked: true };
      }
      return { locked: false, attemptsLeft: maxAttempts - c.attempts };
    },
    /** Entrega la sesión retenida y destruye el reto (de un solo uso). */
    consume(id) {
      const c = items.get(String(id || ''));
      if (!c || c.locked) return null;
      items.delete(c.id);
      return c.session;
    },
    size: () => items.size,
  };
}

module.exports = { createChallenges, TTL_MS };

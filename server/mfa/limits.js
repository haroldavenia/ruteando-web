/**
 * Límites del segundo factor: ventana deslizante por clave (p. ej. «3 envíos por persona y método cada 10 minutos»). El contador de
 * intentos fallidos de un reto vive en el propio reto (challenges.js). Todo en memoria: se reinicia con el servidor.
 */
const SEND_LIMIT = { max: 3, windowMs: 10 * 60 * 1000 };
const MAX_ATTEMPTS = 5;

/** `hit(key)` consume un cupo y dice si cabía; `now` se inyecta para poder probarlo con un reloj simulado. */
function createLimiter({ max = SEND_LIMIT.max, windowMs = SEND_LIMIT.windowMs, now = Date.now } = {}) {
  const hits = new Map();
  return {
    hit(key) {
      const t = now();
      const recent = (hits.get(key) || []).filter((at) => t - at < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return { allowed: false, retryAfterMs: windowMs - (t - recent[0]) };
      }
      recent.push(t);
      hits.set(key, recent);
      return { allowed: true, retryAfterMs: 0 };
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

/** Fallos de verificación por persona (no por reto): 10 en 15 minutos bloquean nuevas verificaciones y nuevos retos. */
const FAILURE_LIMIT = { max: 10, windowMs: 15 * 60 * 1000 };

/**
 * Cuenta los códigos erróneos de una persona en una ventana deslizante. Sin esto, quien conoce la contraseña podría abrir retos nuevos
 * sin fin y probar 5 códigos en cada uno. `state(key).blocked` no consume nada; `record` anota un fallo; `clear` lo olvida al acertar.
 */
function createFailureTracker({ max = FAILURE_LIMIT.max, windowMs = FAILURE_LIMIT.windowMs, now = Date.now } = {}) {
  const failures = new Map();
  const recent = (key) => (failures.get(key) || []).filter((at) => now() - at < windowMs);
  return {
    state(key) {
      const list = recent(key);
      failures.set(key, list);
      return list.length >= max
        ? { blocked: true, retryAfterMs: windowMs - (now() - list[0]) }
        : { blocked: false, retryAfterMs: 0 };
    },
    record(key) {
      failures.set(key, [...recent(key), now()]);
    },
    clear: (key) => void failures.delete(key),
  };
}

module.exports = { createLimiter, createFailureTracker, SEND_LIMIT, MAX_ATTEMPTS, FAILURE_LIMIT };

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

module.exports = { createLimiter, SEND_LIMIT, MAX_ATTEMPTS };

/**
 * Códigos de un solo uso de 6 dígitos en memoria (correo y SMS de desarrollo): se guardan solo como huella, caducan a los 5 minutos
 * y se gastan al acertar. Un fallo no gasta el código (el límite de intentos es del reto, en challenges.js).
 */
const TTL_MS = 5 * 60 * 1000;

function createCodeStore({ codec, now = Date.now, ttlMs = TTL_MS }) {
  const codes = new Map();
  return {
    /** Emite un código nuevo para la clave (sustituye al anterior) y lo devuelve para enviarlo. */
    issue(key) {
      const code = codec.numericCode();
      codes.set(key, { hash: codec.hash('code:' + key, code), expiresAt: now() + ttlMs });
      return code;
    },
    /** `true` solo si el código es el vigente de esa clave; en ese caso queda gastado. */
    check(key, code) {
      const entry = codes.get(key);
      if (!entry) return false;
      if (entry.expiresAt <= now()) {
        codes.delete(key);
        return false;
      }
      if (!codec.safeEqual(entry.hash, codec.hash('code:' + key, String(code || '').replace(/\s/g, '')))) return false;
      codes.delete(key);
      return true;
    },
    discard: (key) => void codes.delete(key),
  };
}

module.exports = { createCodeStore, TTL_MS };

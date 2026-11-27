/**
 * Códigos de un solo uso de 6 dígitos en memoria (correo y SMS de desarrollo): se guardan solo como huella, caducan a los 5 minutos
 * y se gastan al acertar. Tras 5 fallos el código se descarta (hay que pedir otro); además hay un bloqueo por persona (limits.ts).
 */
import type { Codec } from './crypto';

export const TTL_MS = 5 * 60 * 1000;
/** Intentos erróneos tras los que el código emitido se descarta. */
export const MAX_WRONG = 5;

export function createCodeStore({ codec, now = Date.now, ttlMs = TTL_MS }: { codec: Codec; now?: () => number; ttlMs?: number }) {
  const codes = new Map<string, { hash: string; expiresAt: number; wrong: number }>();
  return {
    /** Emite un código nuevo para la clave (sustituye al anterior) y lo devuelve para enviarlo. */
    issue(key: string): string {
      const code = codec.numericCode();
      codes.set(key, { hash: codec.hash('code:' + key, code), expiresAt: now() + ttlMs, wrong: 0 });
      return code;
    },
    /** `true` solo si el código es el vigente de esa clave; en ese caso queda gastado. */
    check(key: string, code: unknown): boolean {
      const entry = codes.get(key);
      if (!entry) return false;
      if (entry.expiresAt <= now()) {
        codes.delete(key);
        return false;
      }
      if (!codec.safeEqual(entry.hash, codec.hash('code:' + key, String(code || '').replace(/\s/g, '')))) {
        if (++entry.wrong >= MAX_WRONG) codes.delete(key);
        return false;
      }
      codes.delete(key);
      return true;
    },
    discard: (key: string) => void codes.delete(key),
  };
}

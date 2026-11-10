/**
 * Primitivas de criptografía del segundo factor (add-mfa). Una sola clave maestra, `MFA_SECRET_KEY` (32 bytes en base64), de la que
 * salen dos subclaves independientes: una para cifrar los secretos TOTP (AES-256-GCM) y otra para las huellas (HMAC-SHA256) de los
 * códigos, que nunca se guardan en claro. Sin clave válida el módulo entero queda apagado (ver index.js).
 */
const crypto = require('node:crypto');

// Sin 0/O ni 1/I/L: los códigos de recuperación se leen y se teclean a mano
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Devuelve la clave maestra (Buffer de 32 bytes) o `null` si falta o no es válida. */
function parseMasterKey(raw) {
  if (!raw) return null;
  const key = Buffer.from(String(raw).trim(), 'base64');
  return key.length === 32 ? key : null;
}

function createCrypto(masterKey) {
  if (!Buffer.isBuffer(masterKey) || masterKey.length !== 32) {
    throw new Error('MFA_SECRET_KEY debe ser de 32 bytes en base64');
  }
  const sub = (info) => Buffer.from(crypto.hkdfSync('sha256', masterKey, Buffer.alloc(0), info, 32));
  const encKey = sub('ruteando-mfa-enc');
  const macKey = sub('ruteando-mfa-mac');

  /** Cifra texto; devuelve base64 de iv(12) + etiqueta(16) + datos. */
  function encrypt(plain) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
    const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
  }

  /** Descifra lo que devolvió `encrypt`; lanza si fue manipulado o la clave es otra. */
  function decrypt(token) {
    const raw = Buffer.from(String(token), 'base64');
    if (raw.length < 29) throw new Error('Dato cifrado no válido');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  }

  /** Huella de un valor para un propósito (un código de correo no vale como código de recuperación). */
  function hash(purpose, value) {
    return crypto.createHmac('sha256', macKey).update(`${purpose}:${value}`).digest('hex');
  }

  /** Compara dos cadenas en tiempo constante. */
  function safeEqual(a, b) {
    const x = Buffer.from(String(a));
    const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
  }

  /** Código numérico de un solo uso (6 dígitos por defecto), con ceros a la izquierda. */
  function numericCode(digits = 6) {
    return String(crypto.randomInt(0, 10 ** digits)).padStart(digits, '0');
  }

  /** Código de recuperación legible: XXXXX-XXXXX. */
  function recoveryCode() {
    let out = '';
    for (let i = 0; i < 10; i++) out += RECOVERY_ALPHABET[crypto.randomInt(0, RECOVERY_ALPHABET.length)];
    return `${out.slice(0, 5)}-${out.slice(5)}`;
  }

  return { encrypt, decrypt, hash, safeEqual, numericCode, recoveryCode };
}

/** Quita guiones y espacios y pasa a mayúsculas: se acepta `abcde-fghjk`, `ABCDE FGHJK` o `ABCDEFGHJK`. */
function normalizeRecoveryCode(input) {
  return String(input || '')
    .replace(/[\s-]/g, '')
    .toUpperCase();
}

module.exports = { parseMasterKey, createCrypto, normalizeRecoveryCode };

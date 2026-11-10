/**
 * TOTP (RFC 6238) con `node:crypto`: HMAC-SHA1, 6 dígitos y paso de 30 segundos, como espera Google Authenticator. Acepta el paso
 * anterior y el siguiente (desfase del reloj) y nunca el mismo paso dos veces (`lastStep`).
 */
const crypto = require('node:crypto');

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}

function base32Decode(text) {
  let bits = '';
  for (const ch of String(text).replace(/[\s=]/g, '').toUpperCase()) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error('Clave base32 no válida');
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** Secreto nuevo de 20 bytes (el tamaño de SHA-1) en base32. */
function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/** HOTP (RFC 4226) del contador dado. */
function hotp(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac('sha1', base32Decode(secret)).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

function stepAt(nowMs) {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

/** Código TOTP de un instante (milisegundos); lo usan las pruebas y el verificador. */
function totpAt(secret, nowMs) {
  return hotp(secret, stepAt(nowMs));
}

/**
 * Comprueba un código. Devuelve el paso aceptado (para guardarlo como `lastStep`) o `null` si no vale. Un paso igual o anterior
 * a `lastStep` se rechaza: un mismo código no sirve dos veces.
 */
function verifyTotp(secret, code, nowMs, lastStep) {
  const given = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(given)) return null;
  const current = stepAt(nowMs);
  for (const step of [current - 1, current, current + 1]) {
    if (lastStep != null && step <= lastStep) continue;
    const expected = hotp(secret, step);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return step;
  }
  return null;
}

/** Dirección que leen las aplicaciones al escanear el QR. */
function otpauthUri(issuer, account, secret) {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

module.exports = { generateSecret, totpAt, verifyTotp, otpauthUri, base32Encode, base32Decode, STEP_SECONDS };

// Pruebas de las primitivas del segundo factor: cifrado, huellas, códigos y límites.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { parseMasterKey, createCrypto, normalizeRecoveryCode } = require('../mfa/crypto');
const { createFailureTracker, createLimiter } = require('../mfa/limits');

const key = crypto.randomBytes(32);

test('la clave maestra debe ser de 32 bytes en base64; si falta o no vale, no hay módulo', () => {
  assert.equal(parseMasterKey(undefined), null);
  assert.equal(parseMasterKey(''), null);
  assert.equal(parseMasterKey(Buffer.from('corta').toString('base64')), null);
  assert.equal(parseMasterKey(key.toString('base64')).length, 32);
  assert.throws(() => createCrypto(Buffer.alloc(8)));
});

test('cifrar y descifrar devuelve el original y cada cifrado es distinto', () => {
  const c = createCrypto(key);
  const a = c.encrypt('JBSWY3DPEHPK3PXP');
  const b = c.encrypt('JBSWY3DPEHPK3PXP');
  assert.notEqual(a, b);
  assert.equal(c.decrypt(a), 'JBSWY3DPEHPK3PXP');
  assert.ok(!a.includes('JBSWY3DP'));
});

test('un dato manipulado o cifrado con otra clave no se descifra', () => {
  const c = createCrypto(key);
  const token = Buffer.from(c.encrypt('secreto'), 'base64');
  token[token.length - 1] ^= 1;
  assert.throws(() => c.decrypt(token.toString('base64')));
  assert.throws(() => createCrypto(crypto.randomBytes(32)).decrypt(c.encrypt('secreto')));
  assert.throws(() => c.decrypt('corto'));
});

test('las huellas dependen del propósito y de la clave, y se comparan en tiempo constante', () => {
  const c = createCrypto(key);
  assert.equal(c.hash('email', '123456'), c.hash('email', '123456'));
  assert.notEqual(c.hash('email', '123456'), c.hash('recovery', '123456'));
  assert.notEqual(c.hash('email', '123456'), createCrypto(crypto.randomBytes(32)).hash('email', '123456'));
  assert.ok(c.safeEqual('abc', 'abc'));
  assert.ok(!c.safeEqual('abc', 'abd'));
  assert.ok(!c.safeEqual('abc', 'abcd'));
});

test('los códigos numéricos tienen 6 dígitos con ceros y los de recuperación son legibles', () => {
  const c = createCrypto(key);
  for (let i = 0; i < 200; i++) assert.match(c.numericCode(), /^\d{6}$/);
  const codes = new Set(Array.from({ length: 50 }, () => c.recoveryCode()));
  assert.equal(codes.size, 50);
  for (const code of codes) assert.match(code, /^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
  assert.equal(normalizeRecoveryCode(' abcde-fghjk '), 'ABCDEFGHJK');
  assert.equal(normalizeRecoveryCode(undefined), '');
});

test('el límite de envíos corta al cuarto en la ventana y se libera pasado el tiempo', () => {
  let t = 1_000_000;
  const limiter = createLimiter({ max: 3, windowMs: 600_000, now: () => t });
  assert.ok(limiter.hit('ana:email').allowed);
  t += 1000;
  assert.ok(limiter.hit('ana:email').allowed);
  t += 1000;
  assert.ok(limiter.hit('ana:email').allowed);
  const blocked = limiter.hit('ana:email');
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 590_000 && blocked.retryAfterMs <= 600_000);
  assert.ok(limiter.hit('ana:sms').allowed, 'otro método tiene su propio cupo');
  assert.ok(limiter.hit('luis:email').allowed, 'otra persona tiene su propio cupo');
  t += 600_000;
  assert.ok(limiter.hit('ana:email').allowed, 'pasada la ventana vuelve a haber cupo');
});

test('el bloqueo por persona salta al décimo fallo en 15 minutos, no consume al consultarlo y se libera acertando o esperando', () => {
  let t = 5_000_000;
  const tracker = createFailureTracker({ now: () => t });
  for (let i = 0; i < 9; i++) {
    assert.equal(tracker.state('ana').blocked, false);
    tracker.record('ana');
    t += 1000;
  }
  assert.equal(tracker.state('ana').blocked, false, 'consultar no cuenta');
  tracker.record('ana');
  const blocked = tracker.state('ana');
  assert.equal(blocked.blocked, true);
  assert.ok(blocked.retryAfterMs > 800_000 && blocked.retryAfterMs <= 900_000);
  assert.equal(tracker.state('luis').blocked, false, 'otra persona no se ve afectada');
  t += 15 * 60 * 1000;
  assert.equal(tracker.state('ana').blocked, false, 'pasada la ventana se libera');
  for (let i = 0; i < 10; i++) tracker.record('ana');
  tracker.clear('ana');
  assert.equal(tracker.state('ana').blocked, false, 'acertar lo olvida');
});

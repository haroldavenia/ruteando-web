// TOTP contra los vectores de la RFC 6238 (SHA-1, secreto ASCII «12345678901234567890») y reglas de la ventana.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateSecret, totpAt, verifyTotp, otpauthUri, base32Encode, base32Decode } = require('../mfa/totp');

const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

test('base32 va y vuelve y el secreto generado tiene 20 bytes', () => {
  assert.equal(RFC_SECRET, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.equal(base32Decode(RFC_SECRET).toString(), '12345678901234567890');
  const secret = generateSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.equal(base32Decode(secret).length, 20);
  assert.throws(() => base32Decode('no-valido!'));
});

test('coincide con los vectores de la RFC 6238 (los 6 últimos dígitos de los de 8)', () => {
  const vectors = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ];
  for (const [seconds, code] of vectors) assert.equal(totpAt(RFC_SECRET, seconds * 1000), code, `T=${seconds}`);
});

test('acepta el paso actual, el anterior y el siguiente, y rechaza cualquier otro', () => {
  const now = 1_700_000_000_000;
  const at = (offsetSteps) => totpAt(RFC_SECRET, now + offsetSteps * 30_000);
  assert.notEqual(verifyTotp(RFC_SECRET, at(0), now, null), null);
  assert.notEqual(verifyTotp(RFC_SECRET, at(-1), now, null), null);
  assert.notEqual(verifyTotp(RFC_SECRET, at(1), now, null), null);
  assert.equal(verifyTotp(RFC_SECRET, at(-2), now, null), null);
  assert.equal(verifyTotp(RFC_SECRET, at(2), now, null), null);
});

test('un código ya aceptado en su paso no sirve otra vez', () => {
  const now = 1_700_000_000_000;
  const code = totpAt(RFC_SECRET, now);
  const step = verifyTotp(RFC_SECRET, code, now, null);
  assert.equal(typeof step, 'number');
  assert.equal(verifyTotp(RFC_SECRET, code, now, step), null);
  assert.equal(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now - 30_000), now, step), null, 'el paso anterior tampoco');
});

test('rechaza lo que no son 6 dígitos y tolera espacios', () => {
  const now = 1_700_000_000_000;
  const code = totpAt(RFC_SECRET, now);
  for (const bad of ['', 'abcdef', '12345', '1234567', null, undefined]) {
    assert.equal(verifyTotp(RFC_SECRET, bad, now, null), null);
  }
  assert.notEqual(verifyTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, now, null), null);
});

test('la dirección otpauth lleva emisor, cuenta y secreto codificados', () => {
  const uri = otpauthUri('Ruteando', 'ana+uno@example.invalid', 'ABCDEFGH');
  assert.ok(uri.startsWith('otpauth://totp/Ruteando:ana%2Buno%40example.invalid?'));
  const params = new URL(uri).searchParams;
  assert.equal(params.get('secret'), 'ABCDEFGH');
  assert.equal(params.get('issuer'), 'Ruteando');
  assert.equal(params.get('digits'), '6');
  assert.equal(params.get('period'), '30');
});

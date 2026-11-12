/**
 * JWT mínimo con `node:crypto` (sin dependencias): verifica la firma de un `id_token` (RS256 o ES256, las únicas que admite; `none` y
 * las HS* se rechazan siempre) contra el JWKS del proveedor, y firma el secreto de cliente de Apple (ES256).
 */
const crypto = require('node:crypto');

const ALGS = new Set(['RS256', 'ES256']);
const b64json = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

/** Separa el token en cabecera, cuerpo y firma sin comprobar nada todavía. */
function decodeJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('JWT mal formado');
  return {
    header: b64json(parts[0]),
    payload: b64json(parts[1]),
    signed: `${parts[0]}.${parts[1]}`,
    signature: Buffer.from(parts[2], 'base64url'),
  };
}

/** Clave del JWKS que corresponde a la cabecera (por `kid`; sin `kid` solo vale si el JWKS tiene una única clave). */
function pickKey(header, jwks) {
  const keys = (jwks?.keys || []).filter((k) => !k.use || k.use === 'sig');
  const key = header.kid ? keys.find((k) => k.kid === header.kid) : keys.length === 1 ? keys[0] : null;
  return key && (!key.alg || key.alg === header.alg) ? key : null;
}

/** Comprueba la firma y devuelve `{ header, payload }`; lanza si el algoritmo no es admitido o la firma no cuadra. */
function verifyJwt(token, jwks) {
  const jwt = decodeJwt(token);
  if (!ALGS.has(jwt.header.alg)) throw new Error('Algoritmo de firma no admitido');
  const jwk = pickKey(jwt.header, jwks);
  if (!jwk) throw new Error('No hay clave para verificar la firma');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const data = Buffer.from(jwt.signed);
  const ok =
    jwt.header.alg === 'ES256'
      ? crypto.verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, jwt.signature)
      : crypto.verify('sha256', data, key, jwt.signature);
  if (!ok) throw new Error('Firma no válida');
  return { header: jwt.header, payload: jwt.payload };
}

/** Firma un JWT ES256 con una clave PEM (secreto de cliente de «Sign in with Apple»). */
function signEs256(header, payload, pem) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const signed = `${enc({ alg: 'ES256', ...header })}.${enc(payload)}`;
  const sig = crypto.sign('sha256', Buffer.from(signed), { key: pem, dsaEncoding: 'ieee-p1363' });
  return `${signed}.${sig.toString('base64url')}`;
}

module.exports = { decodeJwt, verifyJwt, signEs256 };

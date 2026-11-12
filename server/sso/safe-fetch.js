/**
 * `fetch` mínimo para las llamadas salientes del SSO que SOLO conecta con direcciones públicas (contra SSRF). El administrador de una
 * empresa escribe el emisor OIDC y el servidor lo consulta, además de su `jwks_uri` y su `token_endpoint`: el nombre se resuelve aquí y
 * se rechaza si alguna de sus direcciones es de bucle local, privada, de enlace local, CGNAT o reservada. La comprobación va en el
 * `lookup` de la propia conexión, así que se conecta exactamente a la dirección validada (sin ventana para el *DNS rebinding*).
 * No sigue redirecciones, solo habla https y corta respuestas de más de 256 KB.
 */
const dns = require('node:dns');
const https = require('node:https');
const net = require('node:net');

const MAX_BYTES = 256 * 1024;

function isPrivateV4(ip) {
  const [a, b, c] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 || // multidifusión y reservadas
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

/** `true` si la dirección IP no es una dirección pública de Internet. */
function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) return isPrivateV4(ip);
  if (!net.isIPv6(ip)) return true;
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return v6 === '::' || v6 === '::1' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith('ff');
}

/** `lookup` de `https.request`: resuelve y deja pasar solo si TODAS las direcciones son públicas. */
function guardedLookup(hostname, options, callback) {
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      return callback(new Error('Dirección no permitida'));
    }
    return options && options.all
      ? callback(null, addresses)
      : callback(null, addresses[0].address, addresses[0].family);
  });
}

/** Misma forma que `fetch` para lo que usa el SSO: `{ status, text() }`. */
function safeFetch(url, init = {}) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(url);
    } catch (err) {
      return reject(err);
    }
    if (target.protocol !== 'https:') return reject(new Error('Solo https'));
    const req = https.request(
      target,
      { method: init.method || 'GET', headers: init.headers, lookup: guardedLookup, signal: init.signal },
      (res) => {
        const chunks = [];
        let size = 0;
        res.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_BYTES) return res.destroy(new Error('Respuesta demasiado grande'));
          chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode, headers: res.headers, text: async () => text });
        });
      }
    );
    req.on('error', reject);
    req.end(init.body);
  });
}

module.exports = { safeFetch, isPrivateAddress };

/** Llamadas HTTP salientes del SSO: tiempo límite, tamaño acotado y errores sin detalles del proveedor. */
const TIMEOUT_MS = 10000;
const MAX_BYTES = 256 * 1024;

class SsoError extends Error {
  /** `code` es lo que ve la persona en la pantalla de acceso (ver `sso-messages.ts` del cliente). */
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

async function request(fetchImpl, url, { method = 'GET', headers = {}, form } = {}) {
  let res;
  try {
    res = await fetchImpl(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...headers,
      },
      body: form ? new URLSearchParams(form).toString() : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error', // un proveedor no debe mandarnos a otra dirección (SSRF por redirección)
    });
  } catch {
    throw new SsoError('PROVIDER_UNAVAILABLE', `No se pudo contactar con ${new URL(url).host}`);
  }
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new SsoError('PROVIDER_ERROR', 'Respuesta demasiado grande');
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

module.exports = { request, SsoError };

export type GatewayMode = 'real' | 'mock';

type Env = Record<string, string | undefined>;

/** Configuración del servidor; la clave del gateway nunca sale de aquí. */
export function readConfig(env: Env = process.env) {
  const mode: string = env.GATEWAY_MODE || 'real';
  const mock = mode === 'mock';
  return {
    gatewayMode: mode as GatewayMode,
    gatewayModeValid: mode === 'real' || mock,
    // En modo mock se apunta al simulado (scripts/mock-gateway.mjs) y no se envía la clave real.
    gatewayUrl: mock ? `http://127.0.0.1:${env.MOCK_GATEWAY_PORT || 4010}` : env.GATEWAY_URL || '',
    gatewayApiKey: mock ? 'mock' : env.GATEWAY_API_KEY || '',
    gatewayTimeoutMs: Number(env.GATEWAY_TIMEOUT_MS) || 30000,
    sessionSecret: env.SESSION_SECRET || '',
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE !== 'false' : env.NODE_ENV === 'production',
  };
}

export const MIN_SESSION_SECRET = 32;

/** Contraseña con la que el gateway simulado deja entrar a sus tres usuarios si no se define `MOCK_GATEWAY_PASSWORD`. */
const MOCK_DEFAULT_PASSWORD = 'demo1234';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** ¿`SITE_URL` apunta a un servidor público? Sin ella (o con localhost) se trata de una máquina local. */
function isPublicSite(env: Env): boolean {
  const url = env.SITE_URL || env.NEXT_PUBLIC_SITE_URL;
  if (!url) return false;
  try {
    return !LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Problemas de configuración que impiden arrancar en producción (lista vacía = todo bien). Fuera de producción no exige nada. */
export function validateConfig(env: Env = process.env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const problems: string[] = [];
  const cfg = readConfig(env);
  if (cfg.sessionSecret.length < MIN_SESSION_SECRET) {
    problems.push(
      `SESSION_SECRET es obligatoria y debe tener al menos ${MIN_SESSION_SECRET} caracteres (openssl rand -base64 32)`
    );
  }
  if (!cfg.gatewayModeValid) problems.push('GATEWAY_MODE debe ser "real" o "mock"');
  // El simulado con su contraseña pública en un servidor accesible desde fuera deja entrar a cualquiera: falla cerrado
  if (
    cfg.gatewayMode === 'mock' &&
    isPublicSite(env) &&
    (!env.MOCK_GATEWAY_PASSWORD || env.MOCK_GATEWAY_PASSWORD === MOCK_DEFAULT_PASSWORD)
  ) {
    problems.push(
      'GATEWAY_MODE=mock en un servidor público exige MOCK_GATEWAY_PASSWORD propia (no vacía ni demo1234): si no, cualquiera entra con los usuarios de prueba'
    );
  }
  if (env.SSO_ALLOW_INSECURE === 'true')
    problems.push('SSO_ALLOW_INSECURE=true solo es para desarrollo: desactiva el filtro contra SSRF');
  return problems;
}

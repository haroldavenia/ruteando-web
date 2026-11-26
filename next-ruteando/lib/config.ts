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

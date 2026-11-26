export type GatewayMode = 'real' | 'mock';

/** Configuración del servidor; la clave del gateway nunca sale de aquí. */
export function readConfig(env: Record<string, string | undefined> = process.env) {
  const mode: string = env.GATEWAY_MODE || 'real';
  return {
    gatewayMode: mode as GatewayMode,
    gatewayModeValid: mode === 'real' || mode === 'mock',
    gatewayUrl: env.GATEWAY_URL || '',
    gatewayApiKey: env.GATEWAY_API_KEY || '',
    gatewayTimeoutMs: Number(env.GATEWAY_TIMEOUT_MS) || 30000,
  };
}

// @vitest-environment node
import { expect, test } from 'vitest';

import { readConfig } from '@/lib/config';

test('GATEWAY_MODE vale real por defecto y rechaza otros valores', () => {
  expect(readConfig({}).gatewayMode).toBe('real');
  expect(readConfig({}).gatewayModeValid).toBe(true);
  expect(readConfig({ GATEWAY_MODE: 'x' }).gatewayModeValid).toBe(false);
});

test('en modo mock apunta al simulado y no usa la clave real', () => {
  const cfg = readConfig({ GATEWAY_MODE: 'mock', GATEWAY_URL: 'https://real', GATEWAY_API_KEY: 'real-key' });
  expect(cfg.gatewayUrl).toBe('http://127.0.0.1:4010');
  expect(cfg.gatewayApiKey).not.toBe('real-key');
});

test('GATEWAY_TIMEOUT_MS cae a 30000', () => {
  expect(readConfig({ GATEWAY_TIMEOUT_MS: 'abc' }).gatewayTimeoutMs).toBe(30000);
  expect(readConfig({ GATEWAY_TIMEOUT_MS: '5000' }).gatewayTimeoutMs).toBe(5000);
});

test('cookies Secure en producción, salvo COOKIE_SECURE=false', () => {
  expect(readConfig({ NODE_ENV: 'production' }).cookieSecure).toBe(true);
  expect(readConfig({ NODE_ENV: 'development' }).cookieSecure).toBe(false);
  expect(readConfig({ NODE_ENV: 'production', COOKIE_SECURE: 'false' }).cookieSecure).toBe(false);
});

import { expect, test } from 'vitest';

import { readConfig } from '@/lib/config';

test('GATEWAY_MODE vale real por defecto y rechaza otros valores', () => {
  expect(readConfig({}).gatewayMode).toBe('real');
  expect(readConfig({}).gatewayModeValid).toBe(true);
  expect(readConfig({ GATEWAY_MODE: 'x' }).gatewayModeValid).toBe(false);
});

test('GATEWAY_TIMEOUT_MS cae a 30000', () => {
  expect(readConfig({ GATEWAY_TIMEOUT_MS: 'abc' }).gatewayTimeoutMs).toBe(30000);
  expect(readConfig({ GATEWAY_TIMEOUT_MS: '5000' }).gatewayTimeoutMs).toBe(5000);
});

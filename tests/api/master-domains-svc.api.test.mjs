/** Sondas de catálogos y unidades (FND-003). */
import assert from 'node:assert/strict';
import { probe, api, login } from './_client.mjs';

const creds = ['SDD_TEST_EMAIL', 'SDD_TEST_PASSWORD'];

probe('[FND-003 CA-6] GET /units devuelve las unidades fijas g, cm3, cm, m, s', creds, async () => {
  const { accessToken } = await login();
  const r = await api('GET', '/units', { token: accessToken });
  assert.equal(r.status, 200);
  assert.deepEqual(['weight', 'volume', 'length', 'distance', 'duration'].map((k) => r.body[k].key), ['g', 'cm3', 'cm', 'm', 's']);
});

probe('[FND-003 CA-7] las claves de Role llegan en minúsculas', creds, async () => {
  const { accessToken } = await login();
  const r = await api('GET', '/master-domains/Role/values', { token: accessToken });
  assert.equal(r.status, 200);
  for (const v of r.body) assert.equal(v.key, v.key.toLowerCase());
});

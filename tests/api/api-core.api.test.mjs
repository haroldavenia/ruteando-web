/** Sondas de la capa API (FND-002) contra el backend real. */
import assert from 'node:assert/strict';
import { probe, api, login } from './_client.mjs';

const creds = ['SDD_TEST_EMAIL', 'SDD_TEST_PASSWORD'];

probe('[FND-002 CA-16] sin Bearer el backend responde 401 JSON UNAUTHORIZED', [], async () => {
  const r = await api('GET', '/places');
  assert.equal(r.status, 401);
  assert.equal(r.body.error, 'UNAUTHORIZED');
});

probe('[FND-002 CA-13] sort fuera de la lista blanca → 400 BAD_REQUEST; permitido → 200', creds, async () => {
  const { accessToken } = await login();
  const bad = await api('GET', '/packages?sort=tenantId,asc', { token: accessToken });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, 'BAD_REQUEST');
  const ok = await api('GET', '/packages?sort=createdAt,desc&size=1', { token: accessToken });
  assert.equal(ok.status, 200);
});

probe('[FND-002 CA-7] audit-logs usa `page` (contrato v3)', creds, async () => {
  const { accessToken } = await login();
  const r = await api('GET', '/audit-logs?page=0&size=1', { token: accessToken });
  assert.equal(r.status, 200);
  assert.equal(typeof r.body.page, 'number');
});

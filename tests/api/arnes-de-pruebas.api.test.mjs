/** Sondas del arnés (FND-001): conectividad y forma de página contra el backend real. */
import assert from 'node:assert/strict';
import { probe, api, login } from './_client.mjs';

probe('[FND-001 CA-6] el backend responde /units y /places con la cuenta de pruebas', ['SDD_TEST_EMAIL', 'SDD_TEST_PASSWORD'], async () => {
  const { accessToken } = await login();
  const units = await api('GET', '/units', { token: accessToken });
  assert.equal(units.status, 200);
  assert.equal(units.body.weight.key, 'g');
  const places = await api('GET', '/places?page=0&size=5', { token: accessToken });
  assert.equal(places.status, 200);
  assert.deepEqual(['content', 'page', 'size', 'totalElements', 'totalPages'].filter((k) => !(k in places.body)), []);
});

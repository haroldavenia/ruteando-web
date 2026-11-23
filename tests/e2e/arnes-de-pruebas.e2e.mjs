/** Humo del arnés E2E (FND-001): SPA compilada + server.js + mock-api. */
import { test, expect } from '@playwright/test';

test('[FND-001 CA-5] [FND-001 CA-10] la SPA compilada carga #/access/login con el formulario', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/access/login');
  await expect(page.locator('form').first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('[FND-001 CA-3] el proxy entrega páginas del mock-api al navegador', async ({ request }) => {
  const ok = await request.get('/api/v1/places?page=0&size=20', { headers: { authorization: 'Bearer e2e' } });
  expect(ok.status()).toBe(200);
  expect(Object.keys(await ok.json()).sort()).toEqual(['content', 'page', 'size', 'totalElements', 'totalPages']);
  expect((await request.get('/api/v1/places')).status()).toBe(401);
});

test('[FND-001 CA-4] los escenarios de error del mock llegan por el proxy', async ({ request }) => {
  const res = await request.post('/api/v1/places', { headers: { authorization: 'Bearer e2e', 'x-mock-scenario': '409' }, data: {} });
  expect(res.status()).toBe(409);
  expect((await res.json()).error).toBe('CONFLICT');
});

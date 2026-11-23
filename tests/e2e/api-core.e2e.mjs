/** Capa API en el navegador (FND-002). */
import { test, expect } from '@playwright/test';

test('[FND-002 CA-14] el enlace del correo /verify-email?token= abre la SPA con el token', async ({ page }) => {
  await page.goto('/verify-email?token=abc');
  await expect(page).toHaveURL(/#\/access\/verify\?token=abc$|#\/access\/login/);
});

test('[FND-002 CA-2] la SPA llama a /api/v1 en el mismo origen (sin CORS)', async ({ page, baseURL }) => {
  await page.goto('/#/access/login');
  const status = await page.evaluate(async () => (await fetch('/api/v1/places', { headers: { Authorization: 'Bearer e2e' } })).status);
  expect(status).toBe(200);
  expect(new URL(baseURL).origin).toBe(new URL(page.url()).origin);
});

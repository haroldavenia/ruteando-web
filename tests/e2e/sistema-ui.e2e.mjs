/** Maquetas navegables (FND-005): cada pantalla se muestra por su ancla y el menú respeta el rol. */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const file = pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'ui', 'maquetas', 'index.html')).href;

test('[FND-005 CA-6] cada pantalla de la maqueta abre por su ancla sin errores y con estados de error documentados', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(file);
  const ids = await page.locator('section.screen').evaluateAll((els) => els.map((e) => e.id).filter((id) => id !== 'inicio'));
  expect(ids.length).toBeGreaterThanOrEqual(33);
  for (const id of ids) {
    await page.goto(`${file}#${id}`);
    const section = page.locator(`section#${id}`);
    await expect(section).toBeVisible();
    await expect(section.locator('.meta')).toContainText(id.toUpperCase());
    await expect(section.locator('details.states')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test('[FND-005 CA-6] el selector de rol filtra el menú (agent no ve usuarios ni plataforma)', async ({ page }) => {
  await page.goto(`${file}#emp-001`);
  await page.locator('#role').selectOption('agent');
  await expect(page.locator('.side a[href="#emp-001"]')).toBeHidden();
  await expect(page.locator('.side a[href="#pla-001"]')).toBeHidden();
  await expect(page.locator('.side a[href="#paq-002"]')).toBeVisible();
  await expect(page.getByRole('status').first()).toContainText('app.forbidden');
});

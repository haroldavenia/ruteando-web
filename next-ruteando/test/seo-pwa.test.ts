import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { aboutContent } from '@/lib/seo/about-content';
import { PRIVATE_PATHS, PUBLIC_PATHS } from '@/lib/site';

const publicDir = join(__dirname, '..', 'public');
const t = (key: string) => key;

describe('manifiesto', () => {
  const m = manifest();
  test('es instalable: nombre, inicio, modo y colores', () => {
    expect(m).toMatchObject({
      name: 'Ruteando',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#5a3fc0',
    });
  });
  test('cada icono y captura declarados existen en public/ y hay uno maskable', () => {
    for (const file of [...(m.icons ?? []), ...(m.screenshots ?? [])]) {
      expect(existsSync(join(publicDir, file.src)), file.src).toBe(true);
    }
    expect(m.icons?.some((icon) => icon.purpose === 'maskable')).toBe(true);
    expect(m.icons?.some((icon) => icon.sizes === '512x512')).toBe(true);
  });
});

describe('robots y sitemap', () => {
  test('lo privado se prohíbe a todos y a los motores de IA; lo público, no', () => {
    const rules = robots().rules as { userAgent: string | string[]; allow?: string | string[]; disallow?: string[] }[];
    for (const rule of rules) {
      expect(rule.disallow).toEqual(expect.arrayContaining(['/middleware/', '/journeys', '/security']));
      expect(rule.disallow).not.toContain('/access');
      expect(rule.disallow).not.toContain('/about');
    }
    expect(rules.some((rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes('GPTBot'))).toBe(true);
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
  test('el sitemap publica solo páginas públicas, con dirección absoluta y sin la raíz', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.every((url) => /^https?:\/\//.test(url))).toBe(true);
    expect(urls.some((url) => url.endsWith('/about'))).toBe(true);
    expect(urls.some((url) => /\/(fleet|journeys|security|profile)/.test(url))).toBe(false);
    expect(PUBLIC_PATHS.filter((p) => PRIVATE_PATHS.some((priv) => p.startsWith(priv)))).toEqual([]);
  });
});

describe('service worker', () => {
  const sw = readFileSync(join(publicDir, 'sw.js'), 'utf8');
  test('nunca toca los datos ni la sesión y guarda la página sin conexión', () => {
    expect(sw).toMatch(/startsWith\('\/middleware\/'\)/);
    expect(sw).toMatch(/startsWith\('\/gateway\/'\)/);
    expect(sw).toMatch(/OFFLINE_URL = '\/offline'/);
    expect(sw).toMatch(/request\.method !== 'GET'/);
  });
  test('no guarda el HTML de las navegaciones (pueden llevar datos de la persona)', () => {
    const navigate = sw.slice(sw.indexOf("request.mode === 'navigate'"));
    expect(navigate).not.toMatch(/cache\.put|caches\.open/);
  });
});

describe('contenido de /about', () => {
  test('cada pregunta tiene respuesta y hay al menos una función', () => {
    const c = aboutContent(t);
    expect(c.faq.length).toBeGreaterThanOrEqual(3);
    expect(c.faq.every((item) => item.question.trim() && item.answer.trim())).toBe(true);
    expect(c.features.length).toBeGreaterThan(0);
  });
  test('llms.txt enlaza las páginas públicas', () => {
    const llms = readFileSync(join(publicDir, 'llms.txt'), 'utf8');
    for (const path of ['/about', '/access', '/legal/privacy']) expect(llms).toContain(`(${path})`);
  });
});

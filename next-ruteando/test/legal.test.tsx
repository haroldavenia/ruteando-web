import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import AccessLayout from '@/app/access/layout';
import LegalPage, { generateMetadata } from '@/app/legal/[doc]/page';
import { BackButton } from '@/components/legal/back-button';
import type * as LegalLinksModule from '@/components/legal/legal-links';
import { I18nProvider } from '@/lib/i18n/client';
import type { Language } from '@/lib/i18n/core';
import { dictionaryOf } from '@/lib/i18n/dictionary';
import { LEGAL, LEGAL_CONTACT } from '@/lib/legal/legal-content';
import { isLegalDoc, LEGAL_DOCS, LEGAL_INFO, legalTitle } from '@/lib/legal/legal-docs';

import { clearJar, jar } from './cookie-jar';
import { renderWithI18n } from './render';

const router = { back: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', async (original) => ({ ...(await original<object>()), useRouter: () => router }));
// React no pinta componentes de servidor asíncronos anidados en pruebas: la página y el marco se prueban con stubs y LegalLinks, aparte
vi.mock('@/components/legal/legal-links', () => ({ LegalLinks: () => <nav data-testid="legal-links" /> }));
vi.mock('@/components/access/access-pitch', () => ({ AccessPitch: () => null }));
vi.mock('next/headers', async () => ({ cookies: async () => (await import('./cookie-jar')).jar }));

beforeEach(() => {
  clearJar();
  Object.values(router).forEach((fn) => fn.mockClear());
});

/** Pinta una página de servidor (asíncrona) dentro del proveedor de idioma, como hace el layout raíz. */
async function renderPage(ui: Promise<React.ReactElement> | React.ReactElement, lang: Language = 'es') {
  const element = await ui;
  return render(
    <I18nProvider lang={lang} dictionary={dictionaryOf(lang)}>
      {element}
    </I18nProvider>
  );
}

describe('contenido legal', () => {
  const languages: Language[] = ['es', 'en', 'pt'];

  test.each(languages)('%s: cada documento tiene introducción y secciones con texto', (lang) => {
    for (const doc of LEGAL_DOCS) {
      const { intro, sections } = LEGAL[lang][doc];
      expect(intro.length, `${lang}/${doc} intro`).toBeGreaterThan(20);
      expect(sections.length, `${lang}/${doc} secciones`).toBeGreaterThan(2);
      for (const s of sections) {
        expect(s.heading.trim(), `${lang}/${doc}`).not.toBe('');
        expect((s.paragraphs?.length ?? 0) + (s.items?.length ?? 0), `${lang}/${doc}/${s.heading}`).toBeGreaterThan(0);
      }
    }
    expect(LEGAL_CONTACT[lang].withEmail).toContain('{email}');
    expect(LEGAL_CONTACT[lang].withoutEmail).not.toContain('{email}');
  });

  test('los tres idiomas tienen las mismas secciones por documento (no se traduce a medias)', () => {
    for (const doc of LEGAL_DOCS) {
      const counts = languages.map((l) => LEGAL[l][doc].sections.length);
      expect(new Set(counts).size, `${doc}: ${counts}`).toBe(1);
      const items = languages.map((l) => LEGAL[l][doc].sections.map((s) => s.items?.length ?? 0).join());
      expect(new Set(items).size, `${doc} viñetas`).toBe(1);
    }
  });

  test('isLegalDoc solo admite los tres documentos', () => {
    expect(LEGAL_DOCS.every(isLegalDoc)).toBe(true);
    for (const bad of ['', 'privacidad', 'PRIVACY', '../etc/passwd', 'constructor', '__proto__']) {
      expect(isLegalDoc(bad), bad).toBe(false);
    }
  });
});

describe('página /legal/[doc]', () => {
  test.each(LEGAL_DOCS)('%s: título, fecha, secciones y contacto', async (doc) => {
    jar.set('rt_lang', 'es');
    await renderPage(LegalPage({ params: Promise.resolve({ doc }) }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(legalTitle(doc, (key) => key));
    expect(screen.getByText(/Última actualización: /)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(LEGAL.es[doc].sections.length + 1);
    expect(screen.getByText(LEGAL_CONTACT.es.withoutEmail)).toBeInTheDocument(); // sin correo configurado remite a quien administra
    expect(screen.getByTestId('legal-links')).toBeInTheDocument();
  });

  test('sale en el idioma de la cookie', async () => {
    jar.set('rt_lang', 'en');
    await renderPage(LegalPage({ params: Promise.resolve({ doc: 'terms' }) }), 'en');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Terms and conditions');
    expect(screen.getByText(/Last updated: /)).toBeInTheDocument();
    expect(screen.getByText(LEGAL.en.terms.intro)).toBeInTheDocument();
  });

  test('un documento desconocido es un 404, no una página vacía', async () => {
    await expect(LegalPage({ params: Promise.resolve({ doc: 'nada' }) })).rejects.toThrow();
    await expect(LegalPage({ params: Promise.resolve({ doc: '__proto__' }) })).rejects.toThrow();
  });

  test('el título de la pestaña lleva el documento; uno desconocido no lleva título', async () => {
    jar.set('rt_lang', 'es');
    expect(await generateMetadata({ params: Promise.resolve({ doc: 'sms' }) })).toEqual({
      title: 'Verificación por SMS · Ruteando',
    });
    expect(await generateMetadata({ params: Promise.resolve({ doc: 'x' }) })).toEqual({});
  });

  test('cuando hay correo de contacto lo usa en vez de remitir a quien administra', async () => {
    jar.set('rt_lang', 'es');
    const original = LEGAL_INFO.contactEmail;
    LEGAL_INFO.contactEmail = ' legal@example.invalid ';
    try {
      await renderPage(LegalPage({ params: Promise.resolve({ doc: 'privacy' }) }));
      expect(
        screen.getByText(LEGAL_CONTACT.es.withEmail.replace('{email}', 'legal@example.invalid'))
      ).toBeInTheDocument();
    } finally {
      LEGAL_INFO.contactEmail = original;
    }
  });
});

describe('LegalLinks', () => {
  const RealLegalLinks = async (props: Parameters<typeof LegalLinksModule.LegalLinks>[0]) =>
    (await vi.importActual<typeof LegalLinksModule>('@/components/legal/legal-links')).LegalLinks(props);

  test('enlaza los tres documentos y la atribución es solo texto (sin enlace a Hanoit)', async () => {
    jar.set('rt_lang', 'es');
    await renderPage(RealLegalLinks({}));
    const nav = screen.getByRole('navigation', { name: 'Información legal' });
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/legal/privacy', '/legal/terms', '/legal/sms']);
    expect(nav).toHaveTextContent(`© ${new Date().getFullYear()} Ruteando by Hanoit, LLC`);
    expect(links.some((a) => /hanoit/i.test(a.getAttribute('href') ?? ''))).toBe(false);
    expect(nav.querySelector('[aria-current]')).toBeNull();
  });

  test('dentro de un documento marca el actual con aria-current', async () => {
    jar.set('rt_lang', 'es');
    await renderPage(RealLegalLinks({ current: 'terms', replace: true }));
    const current = screen.getByRole('link', { current: 'page' });
    expect(current).toHaveAttribute('href', '/legal/terms');
  });

  test('el marco de acceso monta el pie legal', async () => {
    jar.set('rt_lang', 'es');
    await renderPage(AccessLayout({ children: <p>contenido</p> }));
    expect(screen.getByTestId('legal-links')).toBeInTheDocument();
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });
});

describe('BackButton', () => {
  test('con historial vuelve atrás; con el enlace abierto directo va al inicio', async () => {
    const user = userEvent.setup();
    renderWithI18n(<BackButton />);
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(router.back).toHaveBeenCalledTimes(1);
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(router.push).toHaveBeenCalledWith('/');
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

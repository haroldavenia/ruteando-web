import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BackButton } from '@/components/legal/back-button';
import { LegalLinks } from '@/components/legal/legal-links';
import { Brand } from '@/components/ui/brand';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getLanguage, getT } from '@/lib/i18n/server';
import { LEGAL, LEGAL_CONTACT } from '@/lib/legal/legal-content';
import { isLegalDoc, LEGAL_INFO, legalTitle } from '@/lib/legal/legal-docs';
import { getTheme } from '@/lib/theme-server';

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  if (!isLegalDoc(doc)) return {};
  return { title: `${legalTitle(doc, await getT())} · Ruteando` };
}

/**
 * Un documento legal (privacidad, términos, SMS de verificación): página pública, sin sesión, con su propio marco (marca, idioma y tema
 * arriba; los demás documentos abajo). El texto va completo por idioma (`legal-content.ts`) y no pasa por el diccionario de `t()`.
 * BORRADOR sin revisión legal: ver `LEGAL_INFO`.
 */
export default async function LegalPage({ params }: Props) {
  const { doc } = await params;
  if (!isLegalDoc(doc)) notFound();
  const t = await getT();
  const lang = await getLanguage();
  const theme = await getTheme();
  const text = LEGAL[lang][doc];
  const contact = LEGAL_CONTACT[lang];
  const email = LEGAL_INFO.contactEmail.trim();
  const updated = new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(
    new Date(`${LEGAL_INFO.updated}T12:00:00`)
  );

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-on-surface">
      <header className="mx-auto flex w-full max-w-220 flex-none items-center gap-3 p-4">
        <Link href="/" aria-label={t('Ir al inicio')} className="rounded-sm">
          <Brand size="compact" />
        </Link>
        <span className="flex-1" />
        <LanguageToggle />
        <ThemeToggle initial={theme} />
      </header>
      <main className="mx-auto w-full max-w-220 flex-1 px-4 pt-6 pb-10">
        <BackButton />
        <h1 className="mt-5 mb-1 font-brand text-[28px]/9 font-medium tracking-tight">{legalTitle(doc, t)}</h1>
        <p className="text-sm text-on-surface-variant">{t('Última actualización: {0}', [updated])}</p>
        <p className="mt-5 leading-relaxed">{text.intro}</p>
        {text.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mt-8 mb-2 font-brand text-xl font-medium">{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mb-3 leading-relaxed">
                {p}
              </p>
            ))}
            {section.items ? (
              <ul className="mb-3 list-disc ps-5.5">
                {section.items.map((item) => (
                  <li key={item} className="mb-1.5 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
        <section>
          <h2 className="mt-8 mb-2 font-brand text-xl font-medium">{contact.heading}</h2>
          <p className="leading-relaxed">
            {email ? contact.withEmail.replace('{email}', email) : contact.withoutEmail}
          </p>
        </section>
      </main>
      <footer className="mx-auto w-full max-w-220 flex-none border-t border-outline-variant p-4">
        <LegalLinks current={doc} replace />
      </footer>
    </div>
  );
}

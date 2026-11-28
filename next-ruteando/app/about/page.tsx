import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalLinks } from '@/components/legal/legal-links';
import { JsonLd } from '@/components/seo/json-ld';
import { Brand } from '@/components/ui/brand';
import { buttonVariants } from '@/components/ui/button';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getLanguage, getT } from '@/lib/i18n/server';
import { aboutContent } from '@/lib/seo/about-content';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { getTheme } from '@/lib/theme-server';

export async function generateMetadata(): Promise<Metadata> {
  const content = aboutContent(await getT());
  return {
    title: content.title,
    description: content.lead,
    alternates: { canonical: '/about' },
    openGraph: { title: content.title, description: content.lead, url: '/about', type: 'website' },
  };
}

/**
 * Presentación pública del producto (sin sesión): qué es, qué permite y preguntas frecuentes. Pensada para que la lean personas,
 * buscadores y motores de respuestas: un solo `h1`, secciones con encabezados, respuestas cortas y completas, y los mismos textos en los
 * datos estructurados.
 */
export default async function AboutPage() {
  const t = await getT();
  const lang = await getLanguage();
  const theme = await getTheme();
  const content = aboutContent(t);
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      url: SITE_URL,
      description: content.lead,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: ['es', 'en', 'pt'],
      browserRequirements: 'Requires JavaScript',
      featureList: content.features.map((feature) => feature.title),
      publisher: { '@type': 'Organization', name: 'Hanoit, LLC' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: lang,
      mainEntity: content.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ];
  return (
    <div className="min-h-dvh bg-route-glow px-4 py-8">
      <JsonLd data={data} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-card border border-outline-variant bg-surface-container-low p-6 shadow-card sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Brand />
          <div className="flex gap-3">
            <LanguageToggle />
            <ThemeToggle initial={theme} />
          </div>
        </div>

        <header className="flex flex-col gap-3">
          <h1 className="font-brand text-3xl/10 font-bold tracking-tight">{content.title}</h1>
          <p className="text-lg text-on-surface-variant">{content.lead}</p>
          <div>
            <Link href="/access" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              {t('Iniciar sesión')}
            </Link>
          </div>
        </header>

        <section aria-labelledby="features-title" className="flex flex-col gap-4">
          <h2 id="features-title" className="font-brand text-xl font-bold">
            {t('Qué puedes hacer')}
          </h2>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {content.features.map((feature) => (
              <li key={feature.title} className="rounded-control border border-outline-variant p-4">
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-1 text-on-surface-variant">{feature.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-title" className="flex flex-col gap-3">
          <h2 id="faq-title" className="font-brand text-xl font-bold">
            {t('Preguntas frecuentes')}
          </h2>
          <div className="flex flex-col gap-2">
            {content.faq.map((item) => (
              <details key={item.question} className="rounded-control border border-outline-variant px-4 py-3">
                <summary className="cursor-pointer font-medium">{item.question}</summary>
                <p className="mt-2 text-on-surface-variant">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <LegalLinks />
      </main>
    </div>
  );
}

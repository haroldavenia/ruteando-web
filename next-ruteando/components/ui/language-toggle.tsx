'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { cn } from '@/lib/cn';
import { useLang, useT } from '@/lib/i18n/client';
import { type Language, LANGUAGES } from '@/lib/i18n/core';
import { applyLanguage } from '@/lib/prefs-client';

// Nombres propios de cada idioma: no se traducen (quien lo busca tiene que reconocer el suyo aunque la pantalla esté en otro)
const NAMES: Record<Language, { short: string; name: string }> = {
  en: { short: 'EN', name: 'English' },
  es: { short: 'ES', name: 'Español' },
  pt: { short: 'PT', name: 'Português' },
};

/**
 * Selector de idioma en tres botones. Al elegir se guarda la cookie `rt_lang` y se pide `router.refresh()`: el servidor vuelve a pintar
 * el layout con el otro diccionario y todo se actualiza sin recargar la página (en la app Angular era una recarga completa).
 */
export function LanguageToggle({ className }: { className?: string }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(value: Language) {
    if (value === lang) return;
    applyLanguage(value);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('Idioma')}
      aria-busy={pending || undefined}
      className={cn('inline-flex rounded-full border border-outline-variant bg-surface p-0.5', className)}
    >
      {LANGUAGES.map((value) => {
        const active = lang === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={NAMES[value].name}
            aria-label={NAMES[value].name}
            lang={value}
            onClick={() => choose(value)}
            className={cn(
              'inline-grid min-h-10 min-w-10 cursor-pointer place-items-center rounded-full px-2 text-xs font-medium transition-colors duration-120 ease-out',
              active
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-on-surface/8'
            )}
          >
            {NAMES[value].short}
          </button>
        );
      })}
    </div>
  );
}

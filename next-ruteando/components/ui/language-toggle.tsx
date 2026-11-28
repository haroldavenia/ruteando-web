'use client';

import { RiArrowDownSLine, RiCheckLine, RiGlobalLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useState, useTransition } from 'react';

import { cn } from '@/lib/cn';
import { useLang, useT } from '@/lib/i18n/client';
import { type Language, LANGUAGES } from '@/lib/i18n/core';
import { applyLanguage } from '@/lib/prefs-client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Icon } from './icon';

// Nombres propios de cada idioma: no se traducen (quien lo busca tiene que reconocer el suyo aunque la pantalla esté en otro)
const NAMES: Record<Language, { short: string; name: string }> = {
  en: { short: 'EN', name: 'English' },
  es: { short: 'ES', name: 'Español' },
  pt: { short: 'PT', name: 'Português' },
};

/**
 * Selector de idioma: un globo y tres opciones (EN, ES, PT) con un indicador de degradado que se desliza hasta la elegida. Es un grupo de
 * opciones excluyentes (`radiogroup`) y se maneja con las flechas. Al elegir se guarda la cookie `rt_lang` y se pide `router.refresh()`: el
 * servidor vuelve a pintar el layout con el otro diccionario y todo se actualiza sin recargar la página (en la app Angular era una
 * recarga completa).
 */
export function LanguageToggle({
  className,
  variant = 'segmented',
}: {
  className?: string;
  /** `segmented`: el globo y las tres opciones (acceso y páginas públicas). `menu`: una píldora con el idioma actual que abre la lista (barra de la aplicación). */
  variant?: 'segmented' | 'menu';
}) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  /** Posición del idioma elegido: se adelanta al cambio de página para que el indicador ya se deslice. */
  const [index, setIndex] = useState(() => LANGUAGES.indexOf(lang));

  function choose(value: Language) {
    setIndex(LANGUAGES.indexOf(value));
    if (value === lang) return;
    applyLanguage(value);
    startTransition(() => router.refresh());
  }

  if (variant === 'menu') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          title={t('Idioma')}
          aria-label={t('Idioma')}
          aria-busy={pending || undefined}
          className={cn(
            'inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full bg-surface-container pr-2 pl-3 text-[13px]/none font-semibold tracking-[0.06em] text-primary outline -outline-offset-1 outline-outline-variant',
            className
          )}
        >
          <Icon icon={RiGlobalLine} size={20} />
          {NAMES[lang].short}
          <Icon icon={RiArrowDownSLine} size={20} className="text-on-surface-variant max-xs:hidden" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-0">
          <DropdownMenuRadioGroup value={lang} onValueChange={(value) => choose(value as Language)}>
            {LANGUAGES.map((value) => (
              <DropdownMenuRadioItem key={value} value={value} lang={value} className="min-w-47 gap-3.5">
                <span
                  className={cn(
                    'min-w-8 rounded-lg py-1 text-center text-xs/4 font-semibold tracking-[0.06em]',
                    value === lang
                      ? 'bg-brand-gradient text-on-primary'
                      : 'bg-primary-container text-on-primary-container'
                  )}
                >
                  {NAMES[value].short}
                </span>
                <span className="flex-1 text-sm text-on-surface">{NAMES[value].name}</span>
                <Icon icon={RiCheckLine} size={20} className={cn('text-primary', value !== lang && 'invisible')} />
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /** Flechas: pasan al idioma siguiente o anterior (patrón de los grupos de opciones). */
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + LANGUAGES.length) % LANGUAGES.length;
    choose(LANGUAGES[next]!);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('Idioma')}
      aria-busy={pending || undefined}
      onKeyDown={onKey}
      className={cn(
        'inline-flex items-center rounded-full bg-surface-container p-1 outline -outline-offset-1 outline-outline-variant',
        className
      )}
    >
      <Icon icon={RiGlobalLine} size={20} className="mr-1.5 ml-2.5 text-on-surface-variant" />
      <div className="relative grid auto-cols-[48px] grid-flow-col">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-12 rounded-full bg-brand-gradient shadow-[0_2px_8px_color-mix(in_srgb,var(--color-primary)_35%,transparent)] transition-transform duration-340 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${index * 48}px)` }}
        />
        {LANGUAGES.map((value, i) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={i === index}
            tabIndex={i === index ? 0 : -1}
            title={NAMES[value].name}
            aria-label={NAMES[value].name}
            lang={value}
            onClick={() => choose(value)}
            className={cn(
              'relative h-10 cursor-pointer rounded-full text-[13px]/none font-semibold tracking-[0.06em] transition-colors duration-200 motion-reduce:transition-none',
              i === index ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {NAMES[value].short}
          </button>
        ))}
      </div>
    </div>
  );
}

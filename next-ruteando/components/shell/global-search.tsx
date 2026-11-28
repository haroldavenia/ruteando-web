'use client';

import { RiSearchLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import { type NavItem, type QuickAction } from '@/lib/nav-items';

interface Option {
  label: string;
  icon: NavItem['icon'];
  link: string;
}

/** Quita el foco al elemento activo (el campo de búsqueda, tras elegir). Fuera del componente: tocar un ref durante el render lo prohíbe el lint. */
function blurActiveElement() {
  (document.activeElement as HTMLElement | null)?.blur();
}

/** Opción ya numerada en el orden en que se ve (la numeración sirve a las flechas y a `aria-activedescendant`). */
type NumberedOption = Option & { index: number };

/** Texto sin mayúsculas ni tildes, para buscar «vehiculos» y encontrar «Vehículos». */
export function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Búsqueda de la barra superior: «Buscar o ir a…» con una lista agrupada en «Ir a» (las pantallas que el rol puede abrir) y «Acciones»
 * (planificar una jornada, crear o importar paquetes). Ctrl K (o Cmd K) lleva el foco al campo desde cualquier pantalla; al elegir una
 * opción se va a ella y el campo queda vacío. No consulta el gateway: solo conoce las pantallas del menú. Patrón ARIA de combobox con
 * lista (flechas, Intro y Escape), sin dependencias.
 */
export function GlobalSearch({ items, actions }: { items: readonly NavItem[]; actions: readonly QuickAction[] }) {
  const t = useT();
  const router = useRouter();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const groups = useMemo(() => {
    const pages: Option[] = items
      .flatMap((item) => item.children ?? [item])
      .filter((item): item is NavItem & { link: string } => !!item.link)
      .map(({ label, icon, link }) => ({ label: t(label), icon, link }));
    const quick: Option[] = actions.map(({ label, icon, link }) => ({ label: t(label), icon, link }));
    const text = plain(query);
    const matches = (options: Option[]) => options.filter((option) => plain(option.label).includes(text));
    let next = 0;
    return [
      { key: 'pages', label: t('Ir a'), options: matches(pages) },
      { key: 'actions', label: t('Acciones'), options: matches(quick) },
    ]
      .filter((group) => group.options.length > 0)
      .map((group) => ({
        ...group,
        options: group.options.map((option): NumberedOption => ({ ...option, index: next++ })),
      }));
  }, [items, actions, query, t]);

  const flat = groups.flatMap((group) => group.options);
  const optionId = (index: number) => `${id}-option-${index}`;

  // Ctrl K (o Cmd K) lleva el foco al campo y evita el atajo del navegador
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function go(option: Option) {
    router.push(option.link);
    setQuery('');
    setOpen(false);
    blurActiveElement();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (flat.length) setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length);
    } else if (event.key === 'Enter' && open && flat[active]) {
      event.preventDefault();
      go(flat[active]);
    } else if (event.key === 'Escape') {
      if (open) event.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div role="search" className="relative w-full">
      <Icon
        icon={RiSearchLine}
        size={20}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-on-surface-variant"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        autoComplete="off"
        placeholder={t('Buscar o ir a…')}
        aria-label={t('Buscar o ir a una pantalla')}
        aria-keyshortcuts="Control+K"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && flat[active] ? optionId(active) : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded-full border border-outline bg-surface-container-low pr-22 pl-10 text-base text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary focus:outline-3 focus:outline-offset-2 focus:outline-primary"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 flex -translate-y-1/2 gap-1 text-[11px]/4 font-medium text-on-surface-variant"
      >
        <kbd className="rounded-md border border-outline-variant bg-surface px-1.5 py-[3px] font-sans">{t('Ctrl')}</kbd>
        <kbd className="rounded-md border border-outline-variant bg-surface px-1.5 py-[3px] font-sans">{t('K')}</kbd>
      </span>
      {open ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={t('Buscar o ir a una pantalla')}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-control border border-outline-variant bg-surface-container-high p-1 shadow-card"
        >
          {groups.length === 0 ? (
            <li role="option" aria-disabled aria-selected={false} className="p-3 text-sm text-on-surface-variant">
              {t('Sin resultados')}
            </li>
          ) : (
            groups.map((group) => (
              <li key={group.key} role="presentation">
                <span id={`${id}-${group.key}`} className="block px-3 py-2 text-xs font-medium text-on-surface-variant">
                  {group.label}
                </span>
                <ul role="group" aria-labelledby={`${id}-${group.key}`}>
                  {group.options.map((option) => {
                    const current = option.index;
                    return (
                      <li
                        key={option.link}
                        id={optionId(current)}
                        role="option"
                        aria-selected={current === active}
                        // mousedown (y no click): el campo pierde el foco antes del click y la lista se cerraría sin recibirlo
                        onMouseDown={(event) => {
                          event.preventDefault();
                          go(option);
                        }}
                        onMouseEnter={() => setActive(current)}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm',
                          current === active && 'bg-primary-container text-on-primary-container'
                        )}
                      >
                        <Icon icon={option.icon} size={20} />
                        {option.label}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

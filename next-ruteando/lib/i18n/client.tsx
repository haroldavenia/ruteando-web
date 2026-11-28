'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { DEFAULT_LANGUAGE, type Dictionary, type Language, makeT, type TFunction } from './core';

interface I18n {
  lang: Language;
  t: TFunction;
}

const I18nContext = createContext<I18n>({ lang: DEFAULT_LANGUAGE, t: makeT({}) });

/**
 * Entrega a los componentes de cliente el idioma y el diccionario de ESTA petición (los elige el servidor en el layout). Al cambiar de
 * idioma se escribe la cookie y se pide `router.refresh()`: el layout vuelve a renderizar con otro diccionario y todo se actualiza sin
 * recargar la página.
 */
export function I18nProvider({
  lang,
  dictionary,
  children,
}: {
  lang: Language;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ lang, t: makeT(dictionary) }), [lang, dictionary]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useT = (): TFunction => useContext(I18nContext).t;

/** Idioma activo; sirve también de código de `Intl` (fechas y números): `en`, `es` o `pt`. */
export const useLang = (): Language => useContext(I18nContext).lang;

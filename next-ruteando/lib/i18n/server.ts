import { cookies } from 'next/headers';

import { DEFAULT_LANGUAGE, isLanguage, LANG_COOKIE, type Language, makeT, type TFunction } from './core';
import { dictionaryOf } from './dictionary';

/** Idioma de esta petición: la cookie `rt_lang` si es válida, y el inglés si no. */
export async function getLanguage(): Promise<Language> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

/** `t()` para componentes de servidor y Route Handlers. */
export async function getT(): Promise<TFunction> {
  return makeT(dictionaryOf(await getLanguage()));
}

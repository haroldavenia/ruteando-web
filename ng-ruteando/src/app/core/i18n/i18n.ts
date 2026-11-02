/**
 * Idiomas de la aplicación: inglés (por defecto), español y portugués. El texto fuente de la aplicación es el español y es la
 * CLAVE de traducción: los diccionarios `dictionaries/en.ts` y `dictionaries/pt.ts` lo traducen y el español no necesita
 * diccionario (`t()` devuelve la propia clave). El idioma se decide una sola vez al cargar la página (guardado en `localStorage`, o el inglés por defecto) y
 * cambiarlo recarga la página: así los textos calculados al arrancar y los formatos de `Intl` nunca quedan a medias.
 *
 * Los textos con partes variables llevan marcadores `{0}`, `{1}`… tanto en la clave como en la traducción.
 */
export type Language = 'en' | 'es' | 'pt';

export const LANGUAGES: readonly Language[] = ['en', 'es', 'pt'];
export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGE_STORAGE_KEY = 'ruteando-lang';

export type TranslationParams = readonly (string | number)[];

function storedLanguage(): Language | null {
  try {
    const value = typeof localStorage === 'undefined' ? null : localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGES.find((lang) => lang === value) ?? null;
  } catch {
    return null; // sin almacenamiento (modo privado, SSR): idioma por defecto
  }
}

let current: Language = storedLanguage() ?? DEFAULT_LANGUAGE;
let dictionary: Readonly<Record<string, string>> = {};

/** Idioma de esta carga de la página. */
export function language(): Language {
  return current;
}

/** Código de idioma para `Intl` (fechas, números): `en`, `es` o `pt`. */
export function locale(): Language {
  return current;
}

/** Separa un texto de su contexto: `'Inicio||hora'` es «Inicio» en español, pero se traduce aparte de `'Inicio'` (menú) porque en otros idiomas son palabras distintas. */
const CONTEXT = '||';

/** Traduce un texto fuente (en español). Sin traducción devuelve el propio texto (sin contexto): nunca falla ni deja huecos. */
export function t(text: string, params?: TranslationParams): string {
  const translated = dictionary[text] ?? (text.includes(CONTEXT) ? text.slice(0, text.indexOf(CONTEXT)) : text);
  return params ? translated.replace(/\{(\d+)\}/g, (marker, index: string) => String(params[Number(index)] ?? marker)) : translated;
}

/** Sustituye el diccionario activo (lo usan el arranque y las pruebas). */
export function setDictionary(entries: Readonly<Record<string, string>>): void {
  dictionary = entries;
}

/**
 * Cambia el idioma de esta carga. Con `persist` también lo guarda para la próxima visita. Los diccionarios se cargan con
 * `loadDictionary()`; aquí solo se decide el idioma (las pruebas fijan el español, que no necesita diccionario).
 */
export function useLanguage(lang: Language, persist = true): void {
  current = lang;
  if (lang === 'es') {
    dictionary = {};
  }
  if (persist) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // sin almacenamiento: el cambio vale solo hasta recargar
    }
  }
}

/** Carga el diccionario del idioma activo (cada uno va en un trozo aparte y solo se pide el que se usa) y fija `<html lang>`. */
export async function loadDictionary(): Promise<void> {
  if (current === 'en') {
    dictionary = (await import('./dictionaries/en')).EN;
  } else if (current === 'pt') {
    dictionary = (await import('./dictionaries/pt')).PT;
  } else {
    dictionary = {};
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current;
  }
}

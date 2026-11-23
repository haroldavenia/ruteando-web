/**
 * Idiomas de la aplicación: inglés (por defecto), español y portugués. El texto fuente de la aplicación es el español y es la
 * CLAVE de traducción: los diccionarios `dictionaries/en.ts` y `pt.ts` lo traducen y el español no necesita diccionario (`t()`
 * devuelve la propia clave). El idioma se decide una sola vez al cargar la página (guardado en `localStorage`, o el inglés por
 * defecto) y cambiarlo recarga la página: así los textos calculados al arrancar y los formatos de `Intl` nunca quedan a medias.
 *
 * Los diccionarios se importan de forma ESTÁTICA: el idioma y su diccionario existen antes de que se evalúe cualquier módulo de la
 * aplicación (por eso `t()` vale en constantes de módulo) y el navegador ve todo el grafo de módulos desde el HTML, sin cadenas de
 * peticiones. Cuestan unos 35 kB comprimidos entre los dos; cargar solo el activo exigiría una importación diferida de toda la app.
 *
 * Los textos con partes variables llevan marcadores `{0}`, `{1}`… tanto en la clave como en la traducción.
 */
import { EN } from './dictionaries/en';
import { PT } from './dictionaries/pt';

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

const dictionaryOf = (lang: Language): Readonly<Record<string, string>> =>
  lang === 'en' ? EN : lang === 'pt' ? PT : {};

let current: Language = storedLanguage() ?? DEFAULT_LANGUAGE;
let dictionary: Readonly<Record<string, string>> = dictionaryOf(current);
if (typeof document !== 'undefined') {
  document.documentElement.lang = current;
}

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
  return params
    ? translated.replace(/\{(\d+)\}/g, (marker, index: string) => String(params[Number(index)] ?? marker))
    : translated;
}

/** Sustituye el diccionario activo (lo usan las pruebas). */
export function setDictionary(entries: Readonly<Record<string, string>>): void {
  dictionary = entries;
}

/**
 * Cambia el idioma de esta carga y su diccionario. Con `persist` también lo guarda para la próxima visita. Cambiar el idioma en
 * marcha solo se hace en las pruebas y en `LanguageService`, que recarga la página justo después.
 */
export function useLanguage(lang: Language, persist = true): void {
  current = lang;
  dictionary = dictionaryOf(lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
  if (persist) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // sin almacenamiento: el cambio vale solo hasta recargar
    }
  }
}

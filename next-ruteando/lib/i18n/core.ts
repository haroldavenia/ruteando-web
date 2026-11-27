/**
 * Idiomas de la aplicación: inglés (por defecto), español y portugués. El texto fuente es el español y es la CLAVE de traducción: los
 * diccionarios `dictionaries/en.ts` y `pt.ts` lo traducen y el español no necesita diccionario (`t()` devuelve la propia clave). Mismo
 * criterio que ng-ruteando/src/app/core/i18n, con una diferencia de fondo: aquí el idioma lo decide el SERVIDOR en cada petición (cookie
 * `rt_lang`), así que no hay estado global ni recarga al cambiarlo.
 *
 * Los textos con partes variables llevan marcadores `{0}`, `{1}`… tanto en la clave como en la traducción. No armes frases por trozos:
 * escribe una clave por forma (`t('1 evento')`, `t('{0} eventos', [n])`), porque el orden y la concordancia cambian entre idiomas.
 * Un texto con dos sentidos se separa con contexto: `'Inicio||hora'` se ve «Inicio» y se traduce aparte de `'Inicio'` (menú).
 */
export const LANGUAGES = ['en', 'es', 'pt'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';
export const LANG_COOKIE = 'rt_lang';

export type Dictionary = Readonly<Record<string, string>>;
export type TranslationParams = readonly (string | number)[];
export type TFunction = (text: string, params?: TranslationParams) => string;

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language);

/** Separa un texto de su contexto. */
const CONTEXT = '||';

/** Traduce un texto fuente (en español). Sin traducción devuelve el propio texto (sin contexto): nunca falla ni deja huecos. */
export function translate(dictionary: Dictionary, text: string, params?: TranslationParams): string {
  const translated = dictionary[text] ?? (text.includes(CONTEXT) ? text.slice(0, text.indexOf(CONTEXT)) : text);
  return params
    ? translated.replace(/\{(\d+)\}/g, (marker, index: string) => String(params[Number(index)] ?? marker))
    : translated;
}

export const makeT =
  (dictionary: Dictionary): TFunction =>
  (text, params) =>
    translate(dictionary, text, params);

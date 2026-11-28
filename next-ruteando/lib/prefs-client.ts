import { LANG_COOKIE, type Language } from './i18n/core';
import { type Theme, THEME_COOKIE, themeAttribute } from './theme';

/**
 * Efectos del navegador de las preferencias (idioma y tema). Viven aquí y no en los componentes porque tocan `document`: así los
 * componentes quedan puros y estos efectos se prueban solos. Las cookies no son secretas (solo guardan una preferencia), por eso las
 * escribe el cliente; llevan `Secure` cuando la página va por https.
 */
const ONE_YEAR = 60 * 60 * 24 * 365;

function writeCookie(name: string, value: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
}

/** Guarda el tema y lo aplica ya (`data-theme` en <html>); «sistema» quita el atributo y deja mandar a `light-dark()`. */
export function applyTheme(theme: Theme) {
  writeCookie(THEME_COOKIE, theme);
  const attribute = themeAttribute(theme);
  if (attribute) document.documentElement.dataset.theme = attribute;
  else delete document.documentElement.dataset.theme;
}

/** Guarda el idioma y actualiza `lang` de <html>; quien llama pide después `router.refresh()` para que el servidor pinte el otro diccionario. */
export function applyLanguage(lang: Language) {
  writeCookie(LANG_COOKIE, lang);
  document.documentElement.lang = lang;
}

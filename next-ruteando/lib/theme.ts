/**
 * Tema: sigue al sistema (`light-dark()` en app/globals.css) salvo que la persona elija Claro u Oscuro. La elección vive en la cookie
 * `rt_theme`: el servidor la lee en el layout y pone `data-theme` en <html>, así que la primera pintura ya sale con el tema bueno (sin
 * script ni parpadeo). «Sistema» no pone ningún atributo.
 */
export const THEMES = ['light', 'system', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'system';
export const THEME_COOKIE = 'rt_theme';

export const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

/** Valor del atributo `data-theme` de <html>; `undefined` (sin atributo) sigue al sistema. */
export const themeAttribute = (theme: Theme) => (theme === 'system' ? undefined : theme);

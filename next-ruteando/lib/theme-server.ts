import { cookies } from 'next/headers';

import { DEFAULT_THEME, isTheme, type Theme, THEME_COOKIE } from './theme';

/** Tema de esta petición: la cookie `rt_theme` si es válida, y «sistema» si no. */
export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}

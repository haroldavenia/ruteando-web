const ORIGIN = 'http://origen.invalid';

/**
 * Destino al que se lleva al usuario tras iniciar sesión, a partir del parámetro `returnUrl`.
 * Solo se aceptan rutas internas de la aplicación; cualquier otra cosa (externa, ambigua, vacía o que
 * vuelva a las pantallas de acceso) da `/`. Evita redirecciones abiertas.
 */
export function safeReturnUrl(raw: string | null | undefined): string {
  if (typeof raw !== 'string' || raw === '') {
    return '/';
  }
  // Debe empezar por una sola `/` (no `//host`, que es una URL con el mismo esquema)
  if (!raw.startsWith('/') || raw.startsWith('//')) {
    return '/';
  }
  // Espacios, caracteres de control y barras invertidas: el navegador los elimina o los convierte en `/`,
  // de modo que `/\t/host` o `/\host` acabarían siendo `//host`
  if (/[\u0000- \u007f\\]/.test(raw)) {
    return '/';
  }
  let url: URL;
  try {
    url = new URL(raw, ORIGIN);
  } catch {
    return '/';
  }
  if (url.origin !== ORIGIN) {
    return '/';
  }
  // La ruta ya normalizada (`/a/../acceso` -> `/acceso`) no puede volver a las pantallas de acceso
  if (url.pathname === '/acceso' || url.pathname.startsWith('/acceso/')) {
    return '/';
  }
  return url.pathname + url.search + url.hash;
}

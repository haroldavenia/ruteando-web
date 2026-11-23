/** Rutas del gateway que no llevan `Authorization` (relativas a la URL base de la API). */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/resend-verification',
  // Pasos del reto de segundo factor: se hacen sin sesión (todavía no hay token)
  '/mfa/login/send',
  '/mfa/login/verify',
  '/mfa/login/complete',
  // Inicio de sesión único: la lista de proveedores y el canje del ticket del regreso se piden sin sesión
  '/sso/providers',
  '/sso/complete',
];
const PUBLIC_PREFIXES = ['/invitations/accept/'];

/** Cabecera con el reto de activación obligatoria del segundo factor: sustituye a la sesión en las altas (no hay token todavía). */
export const MFA_CHALLENGE_HEADER = 'X-MFA-Challenge';

/** `true` si la URL es una petición al gateway (empieza por la URL base seguida de `/`). */
export function isApiUrl(url: string, baseUrl: string): boolean {
  return url.startsWith(baseUrl + '/');
}

/** Ruta de la petición sin la URL base, sin consulta ni fragmento (`/auth/me`). */
export function apiPath(url: string, baseUrl: string): string {
  return url.slice(baseUrl.length).split(/[?#]/)[0];
}

export function isPublicApiPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path) || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** Rutas del gateway que no llevan `Authorization` (relativas a la URL base de la API). */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/resend-verification',
];
const PUBLIC_PREFIXES = ['/invitations/accept/'];

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

import { inject } from '@angular/core';
import { Route, Router, UrlMatchResult, UrlSegment } from '@angular/router';

/** Rutas en español de las versiones anteriores -> las de ahora (inglés). Los enlaces viejos y los correos ya enviados siguen valiendo. */
const TOP: Record<string, string> = {
  acceso: 'access',
  flota: 'fleet',
  lugares: 'places',
  configuraciones: 'settings',
  zonas: 'zones',
  jornadas: 'journeys',
  paquetes: 'packages',
  auditoria: 'audit',
  seguridad: 'security',
  perfil: 'profile',
  'sin-permiso': 'forbidden',
};

const SUB: Record<string, string> = {
  registro: 'register',
  'verificar-email': 'verify-email',
  recuperar: 'recover',
  restablecer: 'reset',
  vehiculos: 'vehicles',
  tipos: 'types',
  conductores: 'drivers',
  nuevo: 'new',
  nueva: 'new',
  importar: 'import',
  rutas: 'routes',
  privacidad: 'privacy',
  terminos: 'terms',
};

/** Traduce los segmentos de una ruta antigua; `null` si no es una de ellas. */
export function legacyPath(segments: readonly string[]): string[] | null {
  const [first, ...rest] = segments;
  if (first === 'legal') {
    return rest.length && rest[0] in SUB ? ['legal', SUB[rest[0]], ...rest.slice(1)] : null;
  }
  if (!first || !(first in TOP)) return null;
  return [TOP[first], ...rest.map((segment) => SUB[segment] ?? segment)];
}

function legacyMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  return legacyPath(segments.map((s) => s.path)) ? { consumed: segments } : null;
}

/** Una sola ruta comodín que reenvía cualquier dirección antigua a la nueva, conservando la consulta y el fragmento. */
export const LEGACY_REDIRECT: Route = {
  matcher: legacyMatcher,
  redirectTo: ({ url, queryParams, fragment }) => {
    const target = legacyPath(url.map((s) => s.path)) ?? [];
    return inject(Router).createUrlTree(['/', ...target], { queryParams, fragment: fragment ?? undefined });
  },
};

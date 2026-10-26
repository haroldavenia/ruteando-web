import { DomainWaypoint, Package } from '../../core/api/models';

/** Una visita es una parada de la ruta con paquete; su estado es el del paquete. */
export interface RouteVisit {
  stop: DomainWaypoint;
  packageId: string;
  /** `loading` mientras se lee el paquete; `unavailable` si el gateway no lo devolvió. */
  state: 'loading' | 'ready' | 'unavailable';
  pkg: Package | null;
}

export interface VisitFilters {
  /** Clave de `PackageStatus`, `unavailable` o `''` para todos los estados. */
  status: string;
  text: string;
}

export const UNAVAILABLE = 'unavailable';
export const ATTENDED = 'attended';
export const NO_FILTERS: VisitFilters = { status: '', text: '' };

/** Minúsculas y sin acentos, para comparar texto escrito a mano. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Estado que se usa para filtrar: el del paquete, `unavailable` si no se pudo leer o `null` mientras carga. */
export function visitStatus(visit: RouteVisit): string | null {
  if (visit.state === 'unavailable') {
    return UNAVAILABLE;
  }
  return visit.state === 'ready' ? (visit.pkg?.status ?? UNAVAILABLE) : null;
}

/** Texto en el que busca el filtro: nombre, guía y dirección del paquete. */
function searchable(visit: RouteVisit): string {
  const pkg = visit.pkg;
  return normalizeText([pkg?.name, pkg?.guideNumber, pkg?.address, pkg?.standardizedAddress].filter(Boolean).join(' '));
}

export function filterVisits(visits: readonly RouteVisit[], filters: VisitFilters): RouteVisit[] {
  const text = normalizeText(filters.text);
  return visits.filter((visit) => {
    if (filters.status && visitStatus(visit) !== filters.status) {
      return false;
    }
    return !text || searchable(visit).includes(text);
  });
}

export function hasFilters(filters: VisitFilters): boolean {
  return filters.status !== '' || filters.text.trim() !== '';
}

export interface VisitProgress {
  attended: number;
  total: number;
}

/** Visitas atendidas sobre el total de visitas de la ruta (sin filtrar). */
export function visitProgress(visits: readonly RouteVisit[]): VisitProgress {
  return { attended: visits.filter((v) => visitStatus(v) === ATTENDED).length, total: visits.length };
}

/** Texto accesible del avance: «4 de 10 visitas atendidas». */
export function progressText({ attended, total }: VisitProgress): string {
  if (total === 0) {
    return 'Esta ruta no tiene visitas';
  }
  return `${attended} de ${total} ${total === 1 ? 'visita atendida' : 'visitas atendidas'}`;
}

/** Visitas de una ruta: las paradas con `packageId`, en orden y aún sin paquete leído. */
export function visitsOf(waypoints: readonly DomainWaypoint[]): RouteVisit[] {
  return waypoints
    .filter((stop): stop is DomainWaypoint & { packageId: string } => !!stop.packageId)
    .map((stop) => ({ stop, packageId: stop.packageId, state: 'loading' as const, pkg: null }));
}

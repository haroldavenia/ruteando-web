import { Page } from '../core/api/api-config';
import { Package } from '../core/api/models';

/** Cuántos paquetes, los más recientes, se piden para las cifras de Inicio: una sola petición, sin recorrer todas las páginas. */
export const FIGURES_SAMPLE_SIZE = 100;

export interface PackageFigures {
  /** Paquetes sobre los que se calcula (los más recientes que llegaron). */
  readonly sample: number;
  /** Paquetes que hay en total en el gateway. */
  readonly total: number;
  /** `true` si la muestra son todos los paquetes; si no, las cifras son de los más recientes. */
  readonly exact: boolean;
  readonly attended: number;
  readonly pending: number;
  readonly unattended: number;
  /** Porcentaje de atendidos sobre la muestra, de 0 a 100 (0 si no hay paquetes). */
  readonly percent: number;
}

/**
 * Cifras de paquetes a partir de una página del listado. `GET /packages` no filtra ni agrupa por estado, así que se cuentan los
 * de la página recibida (los más recientes primero): son exactas cuando el total cabe en ella y, si no, hablan de los más recientes.
 */
export function packageFigures(page: Pick<Page<Package>, 'content' | 'totalElements'>): PackageFigures {
  const sample = page.content.length;
  const count = (status: string) => page.content.filter((item) => item.status === status).length;
  const attended = count('attended');
  return {
    sample,
    total: Math.max(page.totalElements, sample),
    exact: page.totalElements <= sample,
    attended,
    pending: count('pending'),
    unattended: count('unattended'),
    percent: sample === 0 ? 0 : (attended / sample) * 100,
  };
}

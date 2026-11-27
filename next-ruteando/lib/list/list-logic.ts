import type { TFunction } from '@/lib/i18n/core';

/** Tono de una etiqueta de estado (los mismos de `StatusBadge`). */
export type StatusTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

export interface Column<T> {
  id: string;
  header: string;
  /** Texto de la celda; también es el que busca el filtro. */
  cell: (row: T) => string;
  /** Si se indica, el texto de la celda es un enlace a esta dirección. */
  link?: (row: T) => string;
  /** Si se indica, antes del texto se pinta una muestra de este color (`#RRGGBB`); `null` no pinta nada. */
  swatch?: (row: T) => string | null;
  /** Si se indica, la celda se muestra como etiqueta de estado con este tono (el texto es el de `cell`). */
  tone?: (row: T) => StatusTone;
  /** La columna que se queda fija al desplazar la tabla en pantallas estrechas; si ninguna lo dice, la primera. */
  primary?: boolean;
  /** Aspecto del texto: `id` es una referencia en monoespaciada, `strong` un nombre en negrita y `muted` un dato secundario. */
  kind?: 'id' | 'strong' | 'muted';
}

/**
 * Chips de estado sobre una lista que está entera en el cliente: cómo se lee el estado de una fila y qué estados se ofrecen, en orden.
 * Cada chip lleva cuántas filas tiene; los estados sin filas se ocultan salvo el elegido.
 */
export interface Facet<T> {
  /** Nombre del grupo para los lectores de pantalla («Estado»). */
  label: string;
  of: (row: T) => string;
  options: readonly { key: string; label: string }[];
}

export interface Chip {
  key: string | null;
  label: string;
  count: number;
  on: boolean;
}

/** Normaliza para comparar sin distinguir mayúsculas ni acentos. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filas con alguna celda que contiene el texto (sin distinguir mayúsculas ni acentos); un texto vacío no filtra. */
export function searchRows<T>(rows: readonly T[], columns: readonly Column<T>[], text: string): readonly T[] {
  const needle = normalizeText(text.trim());
  if (!needle) return rows;
  return rows.filter((row) => columns.some((c) => normalizeText(c.cell(row)).includes(needle)));
}

/** Lo que queda tras elegir un estado; `null` es «Todos». */
export function filterByFacet<T>(rows: readonly T[], facet: Facet<T> | null, key: string | null): readonly T[] {
  return facet && key !== null ? rows.filter((row) => facet.of(row) === key) : rows;
}

/** «Todos» y cada estado con filas (o el elegido), con su recuento sobre lo que cumple la búsqueda. */
export function chipsOf<T>(rows: readonly T[], facet: Facet<T>, chosen: string | null, allLabel: string): Chip[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = facet.of(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [
    { key: null, label: allLabel, count: rows.length, on: chosen === null },
    ...facet.options
      .filter((option) => (counts.get(option.key) ?? 0) > 0 || option.key === chosen)
      .map((option) => ({
        key: option.key,
        label: option.label,
        count: counts.get(option.key) ?? 0,
        on: chosen === option.key,
      })),
  ];
}

/** Una página de las filas; el índice se ajusta al último si lo filtrado se acortó. */
export function paginate<T>(rows: readonly T[], page: number, size: number) {
  const last = Math.max(0, Math.ceil(rows.length / size) - 1);
  const index = Math.min(Math.max(0, page), last);
  return { rows: rows.slice(index * size, index * size + size), index, last };
}

/** Rango que se está viendo: «1 – 10 de 42». */
export function rangeLabel(index: number, size: number, length: number, t: TFunction): string {
  if (length === 0) return t('0 de 0');
  const start = index * size + 1;
  return t('{0} – {1} de {2}', [start, Math.min(start + size - 1, length), length]);
}

/**
 * Sobre cuántas filas actúa la búsqueda y cuántas se ven. Solo habla cuando hay un filtro o cuando hay más registros de los traídos
 * (el tope de la carga entera).
 */
export function scopeText(
  args: { shown: number; loaded: number; total: number; filtering: boolean; plural: string },
  t: TFunction
): string {
  const more =
    args.total > args.loaded
      ? t('Se muestran los primeros {0} {1} de {2}', [args.loaded, args.plural, args.total])
      : '';
  return [args.filtering ? t('{0} de {1}', [args.shown, args.loaded]) : '', more].filter(Boolean).join(' · ');
}

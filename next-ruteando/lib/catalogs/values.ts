import type { MasterDomain, MasterDomainValue } from '@/lib/api/models';

/** Valores activos sobre el total: «3 de 5». */
export const valuesText = (domain: MasterDomain, of: (active: number, total: number) => string): string =>
  of(domain.values.filter((v) => v.active).length, domain.values.length);

/** Valores en el orden del catálogo: por `sortOrder` (los sin orden al final) y luego por nombre. */
export function sortValues(values: readonly MasterDomainValue[]): MasterDomainValue[] {
  return [...values].sort(
    (a, b) =>
      (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
      a.label.localeCompare(b.label)
  );
}

/** La clave se usa tal cual en el sistema: sin espacios (regla del cliente por prudencia; el gateway no documenta la suya). */
export function keyError(key: string): 'required' | 'spaces' | null {
  const value = key.trim();
  if (value === '') return 'required';
  return /\s/.test(value) ? 'spaces' : null;
}

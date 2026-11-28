import type { Zone, ZoneInput } from '@/lib/api/models';

/** Cuerpo del PUT: el registro cargado sin los campos de solo lectura y con lo editado encima (conserva `active`). */
export function buildZoneUpdateBody(record: Zone, edited: Partial<ZoneInput>): Partial<ZoneInput> {
  const body: Record<string, unknown> = { ...record };
  for (const field of ['id', 'tenantId', 'createdAt', 'updatedAt'] as const) delete body[field];
  return { ...body, ...edited } as Partial<ZoneInput>;
}

export const MAX_CODE_LENGTH = 20;

/** Error del código de una zona: sin espacios y de 1 a 20 caracteres (regla del cliente por prudencia: el gateway no documenta la suya). */
export function codeError(code: string): 'required' | 'spaces' | 'tooLong' | null {
  const value = code.trim();
  if (value === '') return 'required';
  if (/\s/.test(value)) return 'spaces';
  return value.length > MAX_CODE_LENGTH ? 'tooLong' : null;
}

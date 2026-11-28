import type { Settings, SettingsInput } from '@/lib/api/models';

/** Campos que el gateway calcula o resume: no se reenvían al guardar. */
const READ_ONLY_FIELDS: readonly (keyof Settings)[] = [
  'id',
  'tenantId',
  'createdAt',
  'updatedAt',
  'createdBy',
  'placeStart',
  'placeEnd',
  'resources',
];

/**
 * Cuerpo del PUT: el registro cargado sin los campos de solo lectura ni los resúmenes y con lo editado encima, para no perder
 * `globalShiftActive`, `globalBreakActive` ni `active` si el gateway reemplaza el recurso.
 */
export function buildSettingsUpdateBody(record: Settings, edited: Partial<SettingsInput>): Partial<SettingsInput> {
  const body: Record<string, unknown> = { ...record };
  for (const field of READ_ONLY_FIELDS) delete body[field];
  return { ...body, ...edited } as Partial<SettingsInput>;
}

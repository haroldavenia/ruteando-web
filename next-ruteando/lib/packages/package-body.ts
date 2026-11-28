import type { Package, PackageInput } from '@/lib/api/models';

/** Campos que el gateway calcula o que se cambian por otra vía: no se reenvían al guardar. */
const READ_ONLY_FIELDS: readonly (keyof Package)[] = [
  'id',
  'tenantId',
  'createdAt',
  'updatedAt',
  'status',
  'standardizedAddress',
  'geocodingScore',
  'geocodingStatus',
];

/**
 * Cuerpo del PUT: el registro cargado sin los campos de solo lectura y con lo editado encima. Así los datos que la pantalla no sabe
 * editar (medidas, ventana horaria, remitente...) no se pierden si el gateway reemplaza el recurso al recibir un PUT.
 */
export function buildUpdateBody(record: Package, edited: Partial<PackageInput>): Partial<PackageInput> {
  const body: Record<string, unknown> = { ...record };
  for (const field of READ_ONLY_FIELDS) delete body[field];
  return { ...body, ...edited } as Partial<PackageInput>;
}

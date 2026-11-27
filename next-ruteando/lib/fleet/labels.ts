import type { TFunction } from '@/lib/i18n/core';

import { type CapacitySource, CM3_PER_M3, decodeCapacity } from './capacity-codec';

/** Etiquetas de los perfiles de ruteo (`OsrmProfile`); los valores del gateway vienen en inglés. */
export function profileLabel(key: string, t: TFunction): string {
  const labels: Record<string, string> = { driving: t('Conducción'), cycling: t('Bicicleta'), walking: t('A pie') };
  return labels[key] ?? key;
}

/** Tipos de documento del dominio maestro `IdentifierType`, por si todavía no se cargó. */
export const IDENTIFIER_KEYS: readonly string[] = ['citizen_id', 'itin', 'plate', 'code'];

export function identifierLabel(key: string, t: TFunction): string {
  const labels: Record<string, string> = {
    citizen_id: t('Documento de identidad'),
    itin: t('Identificación fiscal'),
    plate: t('Placa'),
    code: t('Código interno'),
  };
  return labels[key] ?? key;
}

/** «Documento de identidad 1020304050», o solo el número si no hay tipo, o vacío si no hay documento. */
export function identifierText(
  user: { identifierType: string | null; identifierValue: string | null },
  t: TFunction
): string {
  const value = user.identifierValue?.trim() ?? '';
  const type = user.identifierType?.trim() ?? '';
  if (!value) return '';
  return type ? `${identifierLabel(type, t)} ${value}` : value;
}

/** Capacidad en una frase: «500 kg · 12 m³», «Sin capacidad» o «Definida» si trae datos que la pantalla no sabe leer. */
export function capacitySummary(type: CapacitySource, t: TFunction, lang: string): string {
  const quantity = new Intl.NumberFormat(lang, { maximumFractionDigits: 2, useGrouping: false });
  const { weight, volume } = decodeCapacity(type);
  const parts = [
    weight !== null && weight > 0 ? t('{0} kg', [quantity.format(weight)]) : '',
    volume !== null && volume > 0 ? t('{0} m³', [quantity.format(volume / CM3_PER_M3)]) : '',
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(' · ');
  const unreadable = [type.capacity, type.measure, type.restriction].some(
    (part) => part !== null && Object.keys(part).length > 0
  );
  return unreadable ? t('Definida') : t('Sin capacidad');
}

/** Categorías habituales de tipo de vehículo; el campo admite otras. */
export const RESOURCE_CATEGORIES: readonly string[] = ['van', 'truck', 'car', 'motorcycle', 'bicycle'];

/** Nombre completo de una persona o, si no tiene, su correo. */
export function driverName(user: { firstName: string | null; lastName: string | null; email: string }): string {
  const full = [user.firstName, user.lastName].filter((part): part is string => !!part?.trim()).join(' ');
  return full || user.email;
}

/** Identifica un vehículo en etiquetas y avisos: su matrícula o, si no tiene, su nombre. */
export function vehicleLabel(vehicle: { licensePlate: string | null; name: string }): string {
  return vehicle.licensePlate?.trim() || vehicle.name;
}

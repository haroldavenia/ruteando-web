import { CM3_PER_M3, CapacitySource, decodeCapacity } from './resource-types/capacity-codec';

/** Etiquetas en español de los perfiles de ruteo (`OsrmProfile`); los valores del gateway vienen en inglés. */
export const OSRM_PROFILE_LABELS: Readonly<Record<string, string>> = {
  driving: 'Conducción',
  cycling: 'Bicicleta',
  walking: 'A pie',
};

export function profileLabel(key: string): string {
  return OSRM_PROFILE_LABELS[key] ?? key;
}

/** Etiquetas en español del dominio maestro `IdentifierType` (documento de una persona); una clave desconocida se muestra tal cual. */
export const IDENTIFIER_LABELS: Readonly<Record<string, string>> = {
  citizen_id: 'Documento de identidad',
  itin: 'Identificación fiscal',
  plate: 'Placa',
  code: 'Código interno',
};

/** Valores de `IdentifierType` del gateway, por si todavía no se cargó el dominio maestro. */
export const IDENTIFIER_KEYS: readonly string[] = Object.keys(IDENTIFIER_LABELS);

export function identifierLabel(key: string): string {
  return IDENTIFIER_LABELS[key] ?? key;
}

/** «Documento de identidad 1020304050», o solo el número si no hay tipo, o vacío si no hay documento. */
export function identifierText(user: { identifierType: string | null; identifierValue: string | null }): string {
  const value = user.identifierValue?.trim() ?? '';
  const type = user.identifierType?.trim() ?? '';
  if (!value) {
    return '';
  }
  return type ? `${identifierLabel(type)} ${value}` : value;
}

const QUANTITY = new Intl.NumberFormat('es', { maximumFractionDigits: 2, useGrouping: false });

/** Capacidad en una frase: «500 kg · 12 m³», «Sin capacidad» o «Definida» si trae datos que la pantalla no sabe leer. */
export function capacitySummary(type: CapacitySource): string {
  const { weight, volume } = decodeCapacity(type);
  const parts = [
    weight !== null && weight > 0 ? `${QUANTITY.format(weight)} kg` : '',
    volume !== null && volume > 0 ? `${QUANTITY.format(volume / CM3_PER_M3)} m³` : '',
  ].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' · ');
  }
  const unreadable = [type.capacity, type.measure, type.restriction].some((part) => part !== null && Object.keys(part).length > 0);
  return unreadable ? 'Definida' : 'Sin capacidad';
}

/** Categorías habituales de tipo de vehículo; el campo admite otras. */
export const RESOURCE_CATEGORIES: readonly string[] = ['van', 'truck', 'car', 'motorcycle', 'bicycle'];

interface NamedUser {
  firstName: string | null;
  lastName: string | null;
  email: string;
}

/** Nombre completo de una persona o, si no tiene, su correo. */
export function driverName(user: NamedUser): string {
  const full = [user.firstName, user.lastName].filter((part): part is string => !!part?.trim()).join(' ');
  return full || user.email;
}

/** Identifica un vehículo en etiquetas y avisos: su matrícula o, si no tiene, su nombre. */
export function vehicleLabel(vehicle: { licensePlate: string | null; name: string }): string {
  return vehicle.licensePlate?.trim() || vehicle.name;
}

/** Etiquetas en español de los perfiles de ruteo (`OsrmProfile`); los valores del gateway vienen en inglés. */
export const OSRM_PROFILE_LABELS: Readonly<Record<string, string>> = {
  driving: 'Conducción',
  cycling: 'Bicicleta',
  walking: 'A pie',
};

export function profileLabel(key: string): string {
  return OSRM_PROFILE_LABELS[key] ?? key;
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

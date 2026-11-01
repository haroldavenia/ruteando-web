import { Resource, ResourceType, User } from '../../core/api/models';
import { toCsv } from '../../shared/data/csv';

import { driverName, identifierLabel, profileLabel } from './fleet-labels';
import { CM3_PER_M3, decodeCapacity } from './resource-types/capacity-codec';

/** Nombre del archivo con la fecha local: `vehiculos-2026-10-31.csv`. */
export function csvFileName(entity: string, now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${entity}-${now.getFullYear()}-${month}-${day}.csv`;
}

const state = (active: boolean): string => (active ? 'Activo' : 'Inactivo');

function cubicMetres(cm3: number | null): number | null {
  return cm3 === null ? null : Math.round((cm3 / CM3_PER_M3) * 1000) / 1000;
}

export function typesToCsv(types: readonly ResourceType[]): string {
  return toCsv(
    ['Nombre', 'Categoría', 'Perfil de ruteo', 'Peso (kg)', 'Volumen (m³)', 'Consumo de combustible'],
    types.map((type) => {
      const { weight, volume } = decodeCapacity(type);
      return [type.name, type.category, profileLabel(type.osrmProfile), weight, cubicMetres(volume), type.gasMileage];
    }),
  );
}

export function vehiclesToCsv(vehicles: readonly Resource[]): string {
  return toCsv(
    ['Nombre', 'Matrícula', 'Tipo', 'Conductor', 'Correo del conductor', 'Cantidad', 'Estado'],
    vehicles.map((vehicle) => [
      vehicle.name,
      vehicle.licensePlate,
      vehicle.resourceType?.name,
      vehicle.assignedUser ? driverName(vehicle.assignedUser) : '',
      vehicle.assignedUser?.email,
      vehicle.quantity,
      state(vehicle.active),
    ]),
  );
}

export function driversToCsv(drivers: readonly User[]): string {
  return toCsv(
    ['Nombre', 'Apellidos', 'Correo', 'Teléfono', 'Tipo de documento', 'Documento', 'Estado'],
    drivers.map((driver) => [
      driver.firstName,
      driver.lastName,
      driver.email,
      driver.phone,
      driver.identifierType ? identifierLabel(driver.identifierType) : '',
      driver.identifierValue,
      state(driver.active),
    ]),
  );
}

import type { Resource, ResourceType, User } from '@/lib/api/models';
import { toCsv } from '@/lib/csv';
import type { TFunction } from '@/lib/i18n/core';

import { CM3_PER_M3, decodeCapacity } from './capacity-codec';
import { driverName, identifierLabel, profileLabel } from './labels';

const state = (active: boolean, t: TFunction) => (active ? t('Activo') : t('Inactivo'));
const cubicMetres = (cm3: number | null) => (cm3 === null ? null : Math.round((cm3 / CM3_PER_M3) * 1000) / 1000);

export function typesToCsv(types: readonly ResourceType[], t: TFunction): string {
  return toCsv(
    [t('Nombre'), t('Categoría'), t('Perfil de ruteo'), 'Peso (kg)', 'Volumen (m³)', t('Consumo de combustible')],
    types.map((type) => {
      const { weight, volume } = decodeCapacity(type);
      return [
        type.name,
        type.category,
        profileLabel(type.osrmProfile, t),
        weight,
        cubicMetres(volume),
        type.gasMileage,
      ];
    })
  );
}

export function vehiclesToCsv(vehicles: readonly Resource[], t: TFunction): string {
  return toCsv(
    [t('Nombre'), t('Matrícula'), t('Tipo'), t('Conductor'), t('Correo del conductor'), t('Cantidad'), t('Estado')],
    vehicles.map((vehicle) => [
      vehicle.name,
      vehicle.licensePlate,
      vehicle.resourceType?.name,
      vehicle.assignedUser ? driverName(vehicle.assignedUser) : '',
      vehicle.assignedUser?.email,
      vehicle.quantity,
      state(vehicle.active, t),
    ])
  );
}

export function driversToCsv(drivers: readonly User[], t: TFunction): string {
  return toCsv(
    [t('Nombre'), t('Apellidos'), t('Correo'), t('Teléfono'), t('Tipo de documento'), t('Documento'), t('Estado')],
    drivers.map((driver) => [
      driver.firstName,
      driver.lastName,
      driver.email,
      driver.phone,
      driver.identifierType ? identifierLabel(driver.identifierType, t) : '',
      driver.identifierValue,
      state(driver.active, t),
    ])
  );
}

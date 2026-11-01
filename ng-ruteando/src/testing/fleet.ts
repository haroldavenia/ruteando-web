import { Page } from '../app/core/api/api-config';
import { Resource, ResourceType, User } from '../app/core/api/models';

import resourceFixture from './fixtures/gateway/get__resources.json';
import typeFixture from './fixtures/gateway/get__resource-types.json';
import driverFixture from './fixtures/gateway/get__users__drivers.json';

/** Un registro real de cada colección de flota (capturado del gateway); sirve de base de los constructores. */
const REAL_TYPE = (typeFixture.response.body as unknown as { content: ResourceType[] }).content[0];
const REAL_RESOURCE = (resourceFixture.response.body as unknown as { content: Resource[] }).content[0];
const REAL_DRIVER = (driverFixture.response.body as unknown as User[])[0];

let counter = 0;
const nextId = (): string => `fleet${String(++counter).padStart(19, '0')}`;

/**
 * Tipo de vehículo ficticio. OJO: el gateway real nunca devolvió `capacity`, `measure` ni `restriction` con valores; los que se pasen
 * aquí son una HIPÓTESIS (kg, cm³ y cm, según `config.defaultWeightUnit` y `defaultVolumeUnit` del tenant en la colección Postman), no un contrato capturado.
 */
export function resourceType(overrides: Partial<ResourceType> = {}): ResourceType {
  return { ...REAL_TYPE, id: nextId(), name: `Tipo ${counter}`, ...overrides };
}

export function resource(overrides: Partial<Resource> = {}): Resource {
  return { ...REAL_RESOURCE, id: nextId(), name: `Vehículo ${counter}`, ...overrides };
}

export function driver(overrides: Partial<User> = {}): User {
  return { ...REAL_DRIVER, id: nextId(), email: `conductor${counter}@example.com`, firstName: 'Conductor', lastName: `${counter}`, ...overrides };
}

/** Página como la entrega el gateway en `resource-types` y `resources` (con `page`). */
export function fleetPage<T>(content: T[], totalElements = content.length, page = 0, size = 100): Page<T> {
  return { content, page, size, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / size)) };
}

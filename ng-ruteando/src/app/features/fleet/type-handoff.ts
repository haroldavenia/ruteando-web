import { safeReturnUrl } from '../../core/auth/return-url';

/**
 * Crear un tipo de vehículo desde el formulario de vehículo y volver sin perder lo escrito: el borrador viaja en el estado de la
 * navegación (no en el almacenamiento), igual que hacía la aplicación anterior con `returnTo.data`.
 */
export interface TypeHandoff {
  /** El borrador del formulario de vehículo; solo el formulario que lo creó sabe leerlo. */
  draft: unknown;
  /** El tipo recién creado, que el formulario de vehículo deja elegido al volver. */
  createdTypeId?: string;
}

const KEY = 'fleetTypeHandoff';

export function toHandoffState(handoff: TypeHandoff): Record<string, TypeHandoff> {
  return { [KEY]: handoff };
}

/** Lee el estado de una navegación; cualquier cosa que no sea el nuestro es `null`. */
export function readHandoff(state: unknown): TypeHandoff | null {
  if (typeof state !== 'object' || state === null || !(KEY in state)) {
    return null;
  }
  const value = (state as Record<string, unknown>)[KEY];
  if (typeof value !== 'object' || value === null || !('draft' in value)) {
    return null;
  }
  const createdTypeId = (value as { createdTypeId?: unknown }).createdTypeId;
  return { draft: (value as { draft: unknown }).draft, ...(typeof createdTypeId === 'string' ? { createdTypeId } : {}) };
}

/**
 * Destino de vuelta (`?volver=`): solo una ruta interna de la flota. Cualquier otra cosa (externa, ambigua, de otra área o que lleve
 * a las pantallas de acceso) es `null`, y el formulario de tipo vuelve entonces a su listado.
 */
export function fleetReturnUrl(raw: string | null): string | null {
  const safe = safeReturnUrl(raw);
  return safe.startsWith('/flota/') ? safe : null;
}

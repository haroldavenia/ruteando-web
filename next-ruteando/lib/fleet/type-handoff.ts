import { safeReturnUrl } from '@/lib/return-url';

/**
 * Crear un tipo de vehículo desde el formulario de vehículo y volver sin perder lo escrito: el borrador viaja en `sessionStorage` (solo
 * esta pestaña) y el tipo recién creado en la dirección de vuelta (`?type=`). Solo funciona desde el navegador.
 */
const KEY = 'ruteando-fleet-type-handoff';

/** Destino de vuelta (`?volver=`): solo una ruta interna de la flota; cualquier otra cosa es `null`. */
export function fleetReturnUrl(raw: string | null | undefined): string | null {
  const safe = safeReturnUrl(raw);
  return safe.startsWith('/fleet/') ? safe : null;
}

export function saveDraft(draft: unknown): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // sin almacenamiento: el borrador simplemente no se recupera
  }
}

/** Lee el borrador guardado y lo borra (se usa una sola vez). */
export function takeDraft<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** La dirección de vuelta con el tipo recién creado. */
export function withCreatedType(returnTo: string, typeId: string): string {
  const url = new URL(returnTo, 'http://origen.invalid');
  url.searchParams.set('type', typeId);
  return url.pathname + url.search;
}

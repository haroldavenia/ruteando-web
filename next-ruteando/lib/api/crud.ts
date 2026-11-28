import { type FailureMessages, getData, requestJson } from '@/lib/api-client';
import type { TFunction } from '@/lib/i18n/core';
import type { Page } from '@/lib/list/fetch-all';

/**
 * Cliente de un recurso del gateway con listado paginado y CRUD, por el proxy de datos del BFF (`/middleware/data/<recurso>`). Es el
 * equivalente de `CrudApi` de Angular: no conoce la interfaz y los fallos salen como `ApiError` con el mensaje ya redactado.
 */
export function crud<T, I>(resource: string, t: TFunction) {
  const base = `/middleware/data/${resource}`;
  const one = (id: string) => `${base}/${encodeURIComponent(id)}`;
  return {
    list: (page = 0, size = 100) => getData<Page<T>>(`${resource}?page=${page}&size=${size}`, t),
    get: (id: string) => getData<T>(`${resource}/${encodeURIComponent(id)}`, t),
    create: (input: I, messages?: FailureMessages) => requestJson<T>('POST', base, input, t, messages),
    update: (id: string, input: Partial<I>, messages?: FailureMessages) =>
      requestJson<T>('PUT', one(id), input, t, messages),
    remove: (id: string, messages?: FailureMessages) => requestJson<void>('DELETE', one(id), undefined, t, messages),
  };
}

/** Lista cuyo recurso responde con un arreglo en vez de una página (conductores). */
export const listAs = <T>(path: string, t: TFunction) => getData<T[]>(path, t);

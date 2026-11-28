/**
 * Almacén de cookies en memoria que sustituye a `cookies()` de `next/headers` en las pruebas (esa función solo existe dentro de una
 * petición de Next). Cada archivo de prueba lo conecta con `vi.mock('next/headers', ...)`.
 */
export interface StoredCookie {
  value: string;
  options: Record<string, unknown>;
}

const store = new Map<string, StoredCookie>();

export const jar = {
  get: (name: string) => (store.has(name) ? { name, value: store.get(name)!.value } : undefined),
  has: (name: string) => store.has(name),
  set(name: string, value: string, options: Record<string, unknown> = {}) {
    // maxAge 0 = el navegador la borra: aquí también desaparece, pero se recuerda que se pidió borrarla
    if (options.maxAge === 0) store.delete(name);
    else store.set(name, { value, options });
    history.push({ name, value, options });
  },
  delete: (name: string) => void store.delete(name),
};

/** Todo lo que se escribió (incluidos los borrados), en orden. */
export const history: { name: string; value: string; options: Record<string, unknown> }[] = [];

export const options = (name: string) => store.get(name)?.options;
export const names = () => [...store.keys()].sort();
export const clearJar = () => {
  store.clear();
  history.length = 0;
};

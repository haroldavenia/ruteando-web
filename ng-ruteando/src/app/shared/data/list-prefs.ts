/** Preferencias de una lista que se recuerdan en el navegador (densidad, tarjetas o tabla). Sin almacenamiento valen los valores por defecto. */
export function readPref<V extends string>(key: string, allowed: readonly V[], fallback: V, browser: boolean): V {
  if (!browser) {
    return fallback;
  }
  try {
    const value = localStorage.getItem(key);
    return allowed.find((option) => option === value) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: string, browser: boolean): void {
  if (!browser) {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento (modo privado, datos bloqueados): la preferencia solo dura la visita
  }
}

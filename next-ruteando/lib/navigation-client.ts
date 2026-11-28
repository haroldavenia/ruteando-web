/**
 * Navegación completa del navegador (no una transición de Next): el SSO lleva a otro sitio y vuelve. Fuera de los componentes porque tocar
 * `window.location` durante el render lo prohíbe el lint, y para poder sustituirla en las pruebas.
 */
export function navigateTo(url: string): void {
  window.location.assign(url);
}

/**
 * Quita un parámetro de la dirección actual sin recargar ni añadir una entrada al historial: los enlaces de un solo uso (verificar el
 * correo, restablecer la contraseña) llevan el token en la consulta y no deben quedarse en la barra ni en el historial.
 */
export function stripQueryParam(name: string): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(name)) return;
  url.searchParams.delete(name);
  window.history.replaceState(window.history.state, '', url);
}

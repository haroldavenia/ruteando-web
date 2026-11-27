/**
 * Navegación completa del navegador (no una transición de Next): el SSO lleva a otro sitio y vuelve. Fuera de los componentes porque tocar
 * `window.location` durante el render lo prohíbe el lint, y para poder sustituirla en las pruebas.
 */
export function navigateTo(url: string): void {
  window.location.assign(url);
}

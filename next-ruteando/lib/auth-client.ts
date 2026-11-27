/**
 * Cierra la sesión: el servidor revoca el refresh token en el gateway (mejor esfuerzo) y borra las tres cookies. El navegador añade solo
 * `Origin` a este POST del mismo origen, que es lo que comprueba `verifySameOrigin`. Devuelve `true` si el servidor respondió bien; la
 * persona sale en cualquier caso (quien llama la lleva a /access).
 */
export async function logout(): Promise<boolean> {
  try {
    const res = await fetch('/middleware/auth/logout', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

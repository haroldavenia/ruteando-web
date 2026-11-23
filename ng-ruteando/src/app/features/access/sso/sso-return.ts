import { safeReturnUrl } from '../../../core/auth/return-url';

const KEY = 'ruteando-sso-return';

/**
 * El destino tras iniciar sesión viaja por el proveedor y de vuelta, así que se guarda en el navegador (no en la dirección de regreso:
 * esa la fija el proveedor). Se valida al leerlo con `safeReturnUrl`. `sessionStorage` puede faltar o lanzar (ventana privada).
 */
export function rememberSsoReturn(returnUrl: string | null): void {
  try {
    if (returnUrl) {
      sessionStorage.setItem(KEY, returnUrl);
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch {
    // sin almacenamiento: se vuelve al inicio
  }
}

/** Destino guardado (ya validado, `/` si no hay) y lo olvida. */
export function takeSsoReturn(): string {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return safeReturnUrl(value);
  } catch {
    return '/';
  }
}

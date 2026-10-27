import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { SessionRefreshService } from '../auth/session-refresh.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { API_BASE_URL } from './api-config';
import { ApiError } from './api-error';
import { genericMessage } from './api-error-messages';
import { apiPath, isApiUrl, isPublicApiPath } from './api-paths';

/** Si al token de acceso le quedan menos de 30 s se renueva antes de enviar la petición. */
export const REFRESH_MARGIN_MS = 30_000;

/** La sesión ya se ha cerrado: el manejador de 401 no debe intentar renovarla otra vez. */
class SessionExpiredError extends ApiError {
  constructor() {
    super({ status: 401, message: genericMessage(401) });
    this.name = 'SessionExpiredError';
  }
}

/**
 * Renueva la sesión ante un 401 (o antes, si el acceso está a punto de caducar) y reintenta la
 * petición una sola vez. Va entre `authInterceptor` y `errorInterceptor`, por eso ve `ApiError`.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const baseUrl = inject(API_BASE_URL);
  const path = apiPath(req.url, baseUrl);
  // Las rutas de autenticación gestionan su propio 401; el cierre de sesión no debe renovar nada
  if (!isApiUrl(req.url, baseUrl) || isPublicApiPath(path) || path === '/auth/logout') {
    return next(req);
  }

  const tokens = inject(TokenStorageService);
  const refresher = inject(SessionRefreshService);

  const withCurrentToken = (request: HttpRequest<unknown>): HttpRequest<unknown> => {
    const token = tokens.get();
    return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  };
  const expire = (): void => refresher.expireSession();

  // Único reintento: si con el token nuevo vuelve a dar 401 no se refresca otra vez, la sesión caducó
  const retry = () =>
    next(withCurrentToken(req)).pipe(
      catchError((retryError: unknown) => {
        if (retryError instanceof ApiError && retryError.status === 401) {
          expire();
        }
        return throwError(() => retryError);
      }),
    );

  const expiresAt = tokens.expiresAt;
  const nearExpiry = tokens.get() !== '' && expiresAt !== null && expiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;

  const first$ = nearExpiry
    ? refresher.refresh().pipe(
        catchError(() => {
          expire();
          return throwError(() => new SessionExpiredError());
        }),
        switchMap(() => next(withCurrentToken(req))),
      )
    : next(req);

  return first$.pipe(
    catchError((error: unknown) => {
      if (!(error instanceof ApiError) || error.status !== 401 || error instanceof SessionExpiredError) {
        return throwError(() => error);
      }
      // Otra petición ya renovó el token mientras esta estaba en vuelo: basta con reintentar
      const current = tokens.get();
      if (current && req.headers.get('Authorization') !== `Bearer ${current}`) {
        return retry();
      }
      return refresher.refresh().pipe(
        // Falló el refresco (o no hay token de refresco): sesión caducada; se devuelve el error original
        catchError(() => {
          expire();
          return throwError(() => error);
        }),
        switchMap(() => retry()),
      );
    }),
  );
};

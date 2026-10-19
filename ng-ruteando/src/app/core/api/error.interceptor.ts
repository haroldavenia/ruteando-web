import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from './api-config';
import { ApiError, readErrorBody } from './api-error';
import { API_ERROR_MESSAGES, REQUEST_ERROR_MESSAGES, resolveErrorMessage } from './api-error-messages';

/**
 * Convierte los fallos HTTP del gateway en `ApiError` con un mensaje en español. No muestra
 * nada ni abre diálogos: cada feature decide cómo avisar (p. ej. con `MatSnackBar`).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const baseUrl = inject(API_BASE_URL);
  const registered = inject(API_ERROR_MESSAGES);

  if (!req.url.startsWith(baseUrl)) {
    return next(req);
  }
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      const { code, details } = readErrorBody(error.error);
      const message = resolveErrorMessage(
        { status: error.status, code },
        req.context.get(REQUEST_ERROR_MESSAGES),
        registered,
      );
      return throwError(() => new ApiError({ status: error.status, code, message, details, raw: error }));
    }),
  );
};

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { TokenStorageService } from '../auth/token-storage.service';
import { API_BASE_URL } from './api-config';
import { apiPath, isApiUrl, isPublicApiPath } from './api-paths';

/** Añade `Authorization: Bearer` a las peticiones al gateway, salvo las rutas públicas y las de otros orígenes. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const baseUrl = inject(API_BASE_URL);
  if (!isApiUrl(req.url, baseUrl) || isPublicApiPath(apiPath(req.url, baseUrl))) {
    return next(req);
  }
  const token = inject(TokenStorageService).get();
  // Sin token no se envía la cabecera (nunca `Bearer ` vacío)
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};

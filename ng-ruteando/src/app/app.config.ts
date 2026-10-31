import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { API_BASE_URL } from './core/api/api-config';
import { authInterceptor } from './core/api/auth.interceptor';
import { errorInterceptor } from './core/api/error.interceptor';
import { refreshInterceptor } from './core/api/refresh.interceptor';
import { AuthService } from './core/auth/auth.service';
import { routes } from './app.routes';
import { OUTLINED_FIELDS_PROVIDER } from './shared/form/outlined-fields';
import { MAP_CONFIG } from './shared/map/map-config';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    { provide: MAP_CONFIG, useValue: environment.map },
    OUTLINED_FIELDS_PROVIDER,
    // Se conserva zone.js (Angular 21 usa zoneless por defecto); pasar a zoneless queda fuera de este change
    provideZoneChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    // Orden: token -> renovación de sesión -> errores (la renovación ve ya los ApiError)
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    // Antes de resolver las rutas protegidas se intenta restaurar la sesión (si falla, anónimo)
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};

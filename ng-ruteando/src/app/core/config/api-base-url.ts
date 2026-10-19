import { InjectionToken } from '@angular/core';

/** URL base de la API, tomada del entorno y provista en `app.config.ts`. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

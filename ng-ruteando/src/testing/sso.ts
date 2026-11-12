import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

/** `SsoApi` sin SSO para las pruebas que montan el acceso con `AuthService` simulado y sin `HttpClient`. */
export const NO_SSO = { providers: () => of({ providers: [] }), startUrl: () => '#' };

/**
 * El acceso, el Perfil y Seguridad piden sus datos de SSO al abrirse: las pruebas que verifican «ninguna petición abierta» las
 * responden como un servidor sin SSO (503), que es lo que deja esas secciones ocultas.
 */
export function dismissSsoRequests(controller: HttpTestingController): void {
  controller
    .match((request) => request.url.includes('/sso/'))
    .forEach((request) => request.flush({ message: 'Sin SSO' }, { status: 503, statusText: 'Service Unavailable' }));
}

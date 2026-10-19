import { Injectable, inject } from '@angular/core';
import { Observable, defer, throwError } from 'rxjs';

import { ApiError } from '../api/api-error';
import { genericMessage } from '../api/api-error-messages';
import { CurrentUser } from './current-user';

/**
 * Aporta el `tenantId` del usuario actual a las peticiones del gateway que lo exigen (p. ej. `zones`).
 * Sin usuario no se envía nada: el observable falla con un error genérico de sesión no válida.
 */
@Injectable({ providedIn: 'root' })
export class TenantContext {
  private readonly currentUser = inject(CurrentUser);

  /** Ejecuta `request` con el `tenantId` actual, o falla sin llegar a crear la petición. */
  withTenant<T>(request: (tenantId: string) => Observable<T>): Observable<T> {
    return defer(() => {
      const tenantId = this.currentUser.tenantId();
      if (!tenantId) {
        return throwError(() => new ApiError({ status: 401, message: genericMessage(401) }));
      }
      return request(tenantId);
    });
  }
}

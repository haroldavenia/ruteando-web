import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CrudApi } from '../crud-api';
import { Package, PackageInput } from '../models';

/**
 * Paquetes a planificar. No incluye la subida de CSV (`POST /packages/upload`): el gateway no
 * documenta su contrato (la captura devuelve 400); hasta entonces se crean con `create()`.
 */
@Injectable({ providedIn: 'root' })
export class PackagesApi extends CrudApi<Package, PackageInput> {
  protected readonly resource = 'packages';

  /** Cambia el estado (`PackageStatus`: `pending`, `attended`, `cancelled`...). */
  setStatus(id: string, status: string): Observable<Package> {
    return this.http.patch<Package>(this.url(id, 'status', status), null);
  }
}

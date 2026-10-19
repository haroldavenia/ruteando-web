import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CrudApi } from '../crud-api';
import { Resource, ResourceInput } from '../models';

@Injectable({ providedIn: 'root' })
export class ResourcesApi extends CrudApi<Resource, ResourceInput> {
  protected readonly resource = 'resources';

  assignDriver(resourceId: string, driverId: string): Observable<Resource> {
    return this.http.put<Resource>(this.url(resourceId, 'driver', driverId), null);
  }

  unassignDriver(resourceId: string): Observable<void> {
    return this.http.delete<void>(this.url(resourceId, 'driver'));
  }
}

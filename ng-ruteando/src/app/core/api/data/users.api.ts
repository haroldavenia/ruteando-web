import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CrudApi } from '../crud-api';
import { MessageResponse } from '../../auth/session.model';
import { User, UserInput } from '../models';

@Injectable({ providedIn: 'root' })
export class UsersApi extends CrudApi<User, UserInput> {
  protected readonly resource = 'users';

  /** Conductores del tenant (usuarios con rol `driver`); requiere `tenant_admin` o `super_admin`. */
  drivers(): Observable<User[]> {
    return this.http.get<User[]>(this.url('drivers'));
  }

  /** Envía al usuario un enlace para restablecer la contraseña. */
  sendPasswordReset(id: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(this.url(id, 'reset-password'), null);
  }
}

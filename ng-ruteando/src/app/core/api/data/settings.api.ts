import { Injectable } from '@angular/core';

import { CrudApi } from '../crud-api';
import { Settings, SettingsInput } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsApi extends CrudApi<Settings, SettingsInput> {
  protected readonly resource = 'settings';
}

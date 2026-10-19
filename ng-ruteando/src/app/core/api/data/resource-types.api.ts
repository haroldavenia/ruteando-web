import { Injectable } from '@angular/core';

import { CrudApi } from '../crud-api';
import { ResourceType, ResourceTypeInput } from '../models';

@Injectable({ providedIn: 'root' })
export class ResourceTypesApi extends CrudApi<ResourceType, ResourceTypeInput> {
  protected readonly resource = 'resource-types';
}

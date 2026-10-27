import { describeCrudApi } from '../../../../testing/crud-api-spec';
import { ResourceTypeInput } from '../models';
import { ResourceTypesApi } from './resource-types.api';

import list from '../../../../testing/fixtures/gateway/get__resource-types.json';
import get from '../../../../testing/fixtures/gateway/get__resource-types__id.json';
import create from '../../../../testing/fixtures/gateway/post__resource-types.json';
import update from '../../../../testing/fixtures/gateway/put__resource-types__id.json';
import remove from '../../../../testing/fixtures/gateway/delete__resource-types__id.json';

describeCrudApi<ResourceTypeInput>({
  name: 'ResourceTypesApi',
  api: ResourceTypesApi,
  resource: 'resource-types',
  fixtures: { list, get, create, update, remove } as unknown as Parameters<typeof describeCrudApi>[0]['fixtures'],
});

import { describeCrudApi } from '../../../../testing/crud-api-spec';
import { ResourceInput } from '../models';
import { ResourcesApi } from './resources.api';

import list from '../../../../testing/fixtures/gateway/get__resources.json';
import get from '../../../../testing/fixtures/gateway/get__resources__id.json';
import create from '../../../../testing/fixtures/gateway/post__resources.json';
import update from '../../../../testing/fixtures/gateway/put__resources__id.json';
import remove from '../../../../testing/fixtures/gateway/delete__resources__id.json';

describeCrudApi<ResourceInput>({
  name: 'ResourcesApi',
  api: ResourcesApi,
  resource: 'resources',
  fixtures: { list, get, create, update, remove } as unknown as Parameters<typeof describeCrudApi>[0]['fixtures'],
});

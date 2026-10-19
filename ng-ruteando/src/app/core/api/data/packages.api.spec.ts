import { describeCrudApi } from '../../../../testing/crud-api-spec';
import { PackageInput } from '../models';
import { PackagesApi } from './packages.api';

import list from '../../../../testing/fixtures/gateway/get__packages.json';
import get from '../../../../testing/fixtures/gateway/get__packages__id.json';
import create from '../../../../testing/fixtures/gateway/post__packages.json';
import update from '../../../../testing/fixtures/gateway/put__packages__id.json';
import remove from '../../../../testing/fixtures/gateway/delete__packages__id.json';

describeCrudApi<PackageInput>({
  name: 'PackagesApi',
  api: PackagesApi,
  resource: 'packages',
  fixtures: { list, get, create, update, remove } as unknown as Parameters<typeof describeCrudApi>[0]['fixtures'],
});

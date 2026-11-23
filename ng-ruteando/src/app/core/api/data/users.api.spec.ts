import { describeCrudApi } from '../../../../testing/crud-api-spec';
import remove from '../../../../testing/fixtures/gateway/delete__users__id.json';
import list from '../../../../testing/fixtures/gateway/get__users.json';
import get from '../../../../testing/fixtures/gateway/get__users__id.json';
import create from '../../../../testing/fixtures/gateway/post__users.json';
import update from '../../../../testing/fixtures/gateway/put__users__id.json';
import { UserInput } from '../models';
import { UsersApi } from './users.api';

describeCrudApi<UserInput>({
  name: 'UsersApi',
  api: UsersApi,
  resource: 'users',
  fixtures: { list, get, create, update, remove } as unknown as Parameters<typeof describeCrudApi>[0]['fixtures'],
});

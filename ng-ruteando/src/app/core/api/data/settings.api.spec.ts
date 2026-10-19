import { describeCrudApi } from '../../../../testing/crud-api-spec';
import { SettingsInput } from '../models';
import { SettingsApi } from './settings.api';

import list from '../../../../testing/fixtures/gateway/get__settings.json';
import get from '../../../../testing/fixtures/gateway/get__settings__id.json';
import create from '../../../../testing/fixtures/gateway/post__settings.json';
import update from '../../../../testing/fixtures/gateway/put__settings__id.json';
import remove from '../../../../testing/fixtures/gateway/delete__settings__id.json';

describeCrudApi<SettingsInput>({
  name: 'SettingsApi',
  api: SettingsApi,
  resource: 'settings',
  fixtures: { list, get, create, update, remove } as unknown as Parameters<typeof describeCrudApi>[0]['fixtures'],
});

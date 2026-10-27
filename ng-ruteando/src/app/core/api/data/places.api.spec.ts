import { describeCrudApi } from '../../../../testing/crud-api-spec';
import { Fixture, firstResult, respondWith, setupApi } from '../../../../testing/api-testing';
import { PlaceInput } from '../models';
import { PlacesApi } from './places.api';

import list from '../../../../testing/fixtures/gateway/get__places.json';
import get from '../../../../testing/fixtures/gateway/get__places__id.json';
import create from '../../../../testing/fixtures/gateway/post__places.json';
import update from '../../../../testing/fixtures/gateway/put__places__id.json';
import remove from '../../../../testing/fixtures/gateway/delete__places__id.json';
import nearby from '../../../../testing/fixtures/gateway/get__places__nearby.json';

describeCrudApi<PlaceInput>({
  name: 'PlacesApi',
  api: PlacesApi,
  resource: 'places',
  fixtures: { list, get, create, update, remove } as unknown as Parameters<typeof describeCrudApi>[0]['fixtures'],
});

describe('PlacesApi.nearby', () => {
  it('pide lugares cercanos con lon, lat y maxDistance', async () => {
    const { api, controller } = setupApi(PlacesApi);
    const result = firstResult(api.nearby({ lat: 4.60872, lng: -74.07728 }, 5000));

    const req = controller.expectOne({ method: 'GET', url: '/gateway/places/nearby?lon=-74.07728&lat=4.60872&maxDistance=5000' });
    respondWith(req, nearby as unknown as Fixture);

    expect((await result).length).toBe(1);
    controller.verify();
  });
});

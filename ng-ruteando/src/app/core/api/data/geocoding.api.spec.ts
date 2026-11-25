import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstResult } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../api-config';
import { errorInterceptor } from '../error.interceptor';
import { GeocodingApi } from './geocoding.api';
import {
  geocodeBody,
  MATCH_SCORE,
  readGeocodeResult,
  readLocation,
  readReverseResult,
  reverseBody,
} from './geocoding-contract';

describe('contrato de geocodificación (hipótesis sin verificar con el gateway real)', () => {
  it('la petición lleva la dirección y solo la ciudad y el país que tengan valor', () => {
    expect(geocodeBody({ address: ' Carrera 7 # 71-21 ', city: 'Bogotá', country: ' ' })).toEqual({
      address: 'Carrera 7 # 71-21',
      city: 'Bogotá',
    });
    expect(geocodeBody({ address: 'Calle 1' })).toEqual({ address: 'Calle 1' });
  });

  it('la petición inversa envía un punto GeoJSON [longitud, latitud] y rechaza coordenadas inválidas', () => {
    expect(reverseBody({ lat: 4.6, lng: -74.07 })).toEqual({ location: { type: 'Point', coordinates: [-74.07, 4.6] } });
    expect(reverseBody({ lat: 200, lng: 0 })).toBeNull();
  });

  it('lee la ubicación como punto GeoJSON, como {lat, lng} o como {latitude, longitude}', () => {
    expect(readLocation({ type: 'Point', coordinates: [-74.07, 4.6] })).toEqual({ lat: 4.6, lng: -74.07 });
    expect(readLocation({ lat: 4.6, lng: -74.07 })).toEqual({ lat: 4.6, lng: -74.07 });
    expect(readLocation({ latitude: 4.6, longitude: -74.07 })).toEqual({ lat: 4.6, lng: -74.07 });
    expect(readLocation({ coordinates: [999, 4.6] })).toBeNull();
    expect(readLocation('4.6,-74.07')).toBeNull();
    expect(readLocation(null)).toBeNull();
  });

  it('con puntaje alto la dirección queda ubicada y con uno bajo, aproximada', () => {
    const location = { type: 'Point', coordinates: [-74.07, 4.6] };
    expect(readGeocodeResult({ location, score: 0.95, standardizedAddress: 'CR 7 71 21' })).toEqual({
      status: 'match',
      standardizedAddress: 'CR 7 71 21',
      location: { lat: 4.6, lng: -74.07 },
      score: 0.95,
    });
    expect(readGeocodeResult({ location, score: MATCH_SCORE - 0.01 }).status).toBe('mean');
    expect(readGeocodeResult({ location }).status).toBe('match');
  });

  it('el puntaje de 0 a 100 se lleva a la escala de 0 a 1', () => {
    const location = { type: 'Point', coordinates: [-74.07, 4.6] };
    expect(readGeocodeResult({ location, score: 92 }).score).toBeCloseTo(0.92);
    expect(readGeocodeResult({ location, score: 40 })).toEqual(
      jasmine.objectContaining({ status: 'mean', score: 0.4 })
    );
    expect(readGeocodeResult({ location, score: -3 }).score).toBeNull();
  });

  it('un estado explícito de la respuesta manda sobre el puntaje y la ortografía vieja de la dirección se admite', () => {
    const location = { type: 'Point', coordinates: [-74.07, 4.6] };
    expect(readGeocodeResult({ location, score: 0.99, status: 'MEAN' }).status).toBe('mean');
    expect(readGeocodeResult({ location, standarizedAddress: 'CR 7' }).standardizedAddress).toBe('CR 7');
  });

  it('sin ubicación válida, o con un cuerpo que no es un objeto, no está ubicada', () => {
    for (const body of [
      null,
      undefined,
      'x',
      [],
      {},
      { location: null, score: 0.9 },
      { location: { coordinates: [] } },
    ]) {
      expect(readGeocodeResult(body).status).withContext(JSON.stringify(body)).toBe('unmatch');
      expect(readGeocodeResult(body).location).toBeNull();
    }
  });

  it('la respuesta inversa trae dirección, ciudad y país; sin ellas, nulos', () => {
    expect(readReverseResult({ address: ' Calle 1 ', city: 'Bogotá', country: 'Colombia' })).toEqual({
      address: 'Calle 1',
      city: 'Bogotá',
      country: 'Colombia',
    });
    expect(readReverseResult(null)).toEqual({ address: null, city: null, country: null });
  });
});

describe('GeocodingApi', () => {
  let api: GeocodingApi;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(GeocodingApi);
    controller = TestBed.inject(HttpTestingController);
  });
  afterEach(() => controller.verify());

  it('geocode envía la dirección a /geocoding y entrega el resultado en el dominio', async () => {
    const result = firstResult(api.geocode({ address: 'Calle 1', city: 'Bogotá' }));
    const req = controller.expectOne({ method: 'POST', url: '/gateway/geocoding' });
    expect(req.request.body).toEqual({ address: 'Calle 1', city: 'Bogotá' });
    req.flush({ location: { type: 'Point', coordinates: [-74.07, 4.6] }, score: 0.9, standardizedAddress: 'CL 1' });

    expect(await result).toEqual({
      status: 'match',
      standardizedAddress: 'CL 1',
      location: { lat: 4.6, lng: -74.07 },
      score: 0.9,
    });
  });

  it('una dirección que el gateway no encuentra (404 o 422) es «no ubicada», no un error', async () => {
    for (const status of [404, 422]) {
      const result = firstResult(api.geocode({ address: 'Nunca jamás' }));
      controller.expectOne('/gateway/geocoding').flush({ code: 'NOT_FOUND' }, { status, statusText: 'x' });
      expect((await result).status).toBe('unmatch');
    }
  });

  it('un fallo real del gateway (500) sí es un error', async () => {
    const result = firstResult(api.geocode({ address: 'Calle 1' }));
    controller.expectOne('/gateway/geocoding').flush({}, { status: 500, statusText: 'x' });
    await expectAsync(result).toBeRejectedWithError();
  });

  it('reverse envía el punto GeoJSON a /reverse-geocoding y no llama al gateway con coordenadas inválidas', async () => {
    const result = firstResult(api.reverse({ lat: 4.6, lng: -74.07 }));
    const req = controller.expectOne({ method: 'POST', url: '/gateway/reverse-geocoding' });
    expect(req.request.body).toEqual({ location: { type: 'Point', coordinates: [-74.07, 4.6] } });
    req.flush({ address: 'Calle 1' });
    expect((await result).address).toBe('Calle 1');

    expect((await firstResult(api.reverse({ lat: 999, lng: 0 }))).address).toBeNull();
    controller.expectNone('/gateway/reverse-geocoding');
  });
});

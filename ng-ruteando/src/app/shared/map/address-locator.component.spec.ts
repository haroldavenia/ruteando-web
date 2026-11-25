import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { GeocodeResult } from '../../core/api/models';
import { AddressLocatorComponent } from './address-locator.component';
import { createLocationGroup, LocationGroup } from './location-fields.component';

const POINT = { type: 'Point', coordinates: [-74.07, 4.6] };

describe('AddressLocatorComponent', () => {
  let fixture: ComponentFixture<AddressLocatorComponent>;
  let http: HttpTestingController;
  let address: FormControl<string>;
  let city: FormControl<string>;
  let country: FormControl<string>;
  let location: LocationGroup;
  let located: GeocodeResult[];

  const root = () => fixture.nativeElement as HTMLElement;
  const note = () => root().querySelector('.note')?.textContent?.trim();
  const button = (label: string) =>
    Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    address = new FormControl('', { nonNullable: true });
    city = new FormControl('', { nonNullable: true });
    country = new FormControl('', { nonNullable: true });
    location = createLocationGroup();
    located = [];
    fixture = TestBed.createComponent(AddressLocatorComponent);
    fixture.componentRef.setInput('address', address);
    fixture.componentRef.setInput('city', city);
    fixture.componentRef.setInput('country', country);
    fixture.componentRef.setInput('location', location);
    fixture.componentInstance.located.subscribe((r) => located.push(r));
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('sin dirección no llama al gateway y pide escribirla', () => {
    button('Ubicar la dirección').click();
    fixture.detectChanges();

    http.expectNone('/gateway/geocoding');
    expect(note()).toBe('Escribe primero la dirección');
  });

  it('ubica la dirección con su ciudad y país, pone el punto en el formulario y lo marca como modificado', () => {
    address.setValue('Carrera 7 # 71-21');
    city.setValue('Bogotá');
    button('Ubicar la dirección').click();

    const req = http.expectOne({ method: 'POST', url: '/gateway/geocoding' });
    expect(req.request.body).toEqual({ address: 'Carrera 7 # 71-21', city: 'Bogotá' });
    req.flush({ location: POINT, score: 0.95, standardizedAddress: 'CR 7 71 21' });
    fixture.detectChanges();

    expect(location.getRawValue()).toEqual({ lat: 4.6, lng: -74.07 });
    expect(location.dirty).toBeTrue();
    expect(note()).toContain('CR 7 71 21');
    expect(located.length).toBe(1);
    expect(located[0].status).toBe('match');
  });

  it('una ubicación aproximada se avisa para que se revise el punto', () => {
    address.setValue('Centro');
    button('Ubicar la dirección').click();
    http.expectOne('/gateway/geocoding').flush({ location: POINT, score: 0.5 });
    fixture.detectChanges();

    expect(location.getRawValue().lat).toBe(4.6);
    expect(note()).toContain('aproximada');
  });

  it('si no encuentra la dirección no toca el punto y lo dice', () => {
    location.patchValue({ lat: 1, lng: 2 });
    address.setValue('Nunca jamás');
    button('Ubicar la dirección').click();
    http.expectOne('/gateway/geocoding').flush({}, { status: 404, statusText: 'x' });
    fixture.detectChanges();

    expect(location.getRawValue()).toEqual({ lat: 1, lng: 2 });
    expect(note()).toContain('No se encontró la dirección');
    expect(located[0].status).toBe('unmatch');
  });

  it('un fallo del gateway se muestra como error y el botón vuelve a quedar disponible', () => {
    address.setValue('Calle 1');
    button('Ubicar la dirección').click();
    fixture.detectChanges();
    expect(button('Ubicar la dirección').disabled).toBeTrue();
    http.expectOne('/gateway/geocoding').flush({}, { status: 500, statusText: 'x' });
    fixture.detectChanges();

    expect(root().querySelector('.note.error')).not.toBeNull();
    expect(button('Ubicar la dirección').disabled).toBeFalse();
  });

  it('tomar la dirección del punto sin punto pide elegirlo', () => {
    button('Tomar la dirección').click();
    fixture.detectChanges();

    http.expectNone('/gateway/reverse-geocoding');
    expect(note()).toContain('Elige primero un punto');
  });

  it('tomar la dirección del punto rellena la dirección, la ciudad y el país', () => {
    location.patchValue({ lat: 4.6, lng: -74.07 });
    button('Tomar la dirección').click();
    const req = http.expectOne({ method: 'POST', url: '/gateway/reverse-geocoding' });
    expect(req.request.body).toEqual({ location: POINT });
    req.flush({ address: 'Calle 1 # 2-3', city: 'Bogotá', country: 'Colombia' });
    fixture.detectChanges();

    expect([address.value, city.value, country.value]).toEqual(['Calle 1 # 2-3', 'Bogotá', 'Colombia']);
    expect(address.dirty).toBeTrue();
    expect(note()).toBe('Dirección tomada del punto elegido.');
  });

  it('sin dirección conocida para el punto no borra lo escrito', () => {
    address.setValue('Mi dirección');
    location.patchValue({ lat: 4.6, lng: -74.07 });
    button('Tomar la dirección').click();
    http.expectOne('/gateway/reverse-geocoding').flush({});
    fixture.detectChanges();

    expect(address.value).toBe('Mi dirección');
    expect(note()).toContain('No hay una dirección conocida');
  });
});

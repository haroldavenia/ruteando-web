import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { Fixture, respondWith } from '../../../testing/api-testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';

import { PlaceListComponent } from './place-list.component';

import list from '../../../testing/fixtures/gateway/get__places.json';
import remove from '../../../testing/fixtures/gateway/delete__places__id.json';

describe('PlaceListComponent', () => {
  let fixture: ComponentFixture<PlaceListComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const fx = (f: unknown) => f as Fixture;
  const overlayButton = (text: string) =>
    (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlaceListComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(PlaceListComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const load = () => {
    respondWith(http.expectOne((r) => r.url === '/gateway/places'), fx(list));
    fixture.detectChanges();
  };

  it('muestra nombre, tipo en español, y latitud y longitud con cinco decimales', () => {
    load();
    const row = root().querySelector('tr.mat-mdc-row')!.textContent!;
    expect(row).toContain('Postman depot');
    expect(row).toContain('Depósito');
    expect(row).toContain('4,60872 / -74,07728');
    expect(root().textContent).toContain('1 – 1 de 1');
  });

  it('con la lista vacía ofrece crear el primero', () => {
    http.expectOne((r) => r.url === '/gateway/places').flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
    fixture.detectChanges();
    expect(root().textContent).toContain('Todavía no hay lugares');
    expect(root().querySelector('a[href="/lugares/nuevo"][empty-action]')).not.toBeNull();
  });

  it('un tipo desconocido se muestra con su clave', () => {
    const body = JSON.parse(JSON.stringify(fx(list).response.body));
    body.content[0].type = 'kiosk';
    http.expectOne((r) => r.url === '/gateway/places').flush(body);
    fixture.detectChanges();
    expect(root().querySelector('tr.mat-mdc-row')!.textContent).toContain('kiosk');
  });

  describe('borrado', () => {
    async function confirm(): Promise<void> {
      load();
      (root().querySelector('[aria-label="Eliminar lugar Postman depot"]') as HTMLButtonElement).click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      overlayButton('Eliminar').click();
      await wait();
    }

    it('borra tras confirmar y recarga', async () => {
      await confirm();
      respondWith(http.expectOne((r) => r.method === 'DELETE' && r.url.startsWith('/gateway/places/')), fx(remove));
      fixture.detectChanges();
      expect(root().textContent).toContain('Se eliminó lugar «Postman depot»');
      respondWith(http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/places'), fx(list));
    });

    for (const status of [409, 400]) {
      it(`un lugar en uso (${status}) explica por qué no se puede eliminar`, async () => {
        await confirm();
        http.expectOne((r) => r.method === 'DELETE').flush({ message: 'in use' }, { status, statusText: 'x' });
        fixture.detectChanges();
        expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se puede eliminar: el lugar se usa como depósito');
        expect(root().textContent).toContain('Postman depot');
      });
    }

    it('si ya no existe (404) avisa y recarga', async () => {
      await confirm();
      http.expectOne((r) => r.method === 'DELETE').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      respondWith(http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/places'), fx(list));
    });
  });
});

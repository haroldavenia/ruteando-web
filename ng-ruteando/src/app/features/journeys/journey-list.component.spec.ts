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

import { JourneyListComponent } from './journey-list.component';

import list from '../../../testing/fixtures/gateway/get__journeys.json';
import remove from '../../../testing/fixtures/gateway/delete__journeys__id.json';

const fx = (f: unknown) => f as Fixture;

describe('JourneyListComponent', () => {
  let fixture: ComponentFixture<JourneyListComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const item = (fx(list).response.body as { content: { id: string; name: string }[] }).content[0];
  const overlayButton = (text: string) =>
    (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [JourneyListComponent],
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
    fixture = TestBed.createComponent(JourneyListComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const load = (body: unknown = fx(list).response.body) => {
    http.expectOne((r) => r.url === '/gateway/journeys').flush(body as object);
    fixture.detectChanges();
  };
  const reloadAnswer = () => http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/journeys').flush(fx(list).response.body as object);

  it('muestra nombre como enlace, estado, configuración y deja vacíos servicios y vehículos nulos', () => {
    load();
    const row = root().querySelector('tr.mat-mdc-row')!;
    const link = row.querySelector('td a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Postman journey');
    expect(link.getAttribute('href')).toBe(`/jornadas/${item.id}`);
    expect(row.textContent).toContain('Planificada');
    expect(row.textContent).toContain('Postman settings');
    const cells = Array.from(row.querySelectorAll('td')).map((c) => c.textContent!.trim());
    expect(cells[3]).toBe('');
    expect(cells[4]).toBe('');
  });

  it('muestra servicios y vehículos cuando el gateway los informa', () => {
    const body = JSON.parse(JSON.stringify(fx(list).response.body));
    body.content[0].totalServices = 12;
    body.content[0].totalResources = 3;
    load(body);
    const cells = Array.from(root().querySelector('tr.mat-mdc-row')!.querySelectorAll('td')).map((c) => c.textContent!.trim());
    expect(cells[3]).toBe('12');
    expect(cells[4]).toBe('3');
  });

  it('un estado desconocido se muestra con su clave', () => {
    const body = JSON.parse(JSON.stringify(fx(list).response.body));
    body.content[0].status = 'archived';
    load(body);
    expect(root().querySelector('tr.mat-mdc-row')!.textContent).toContain('archived');
  });

  it('con la lista vacía ofrece planificar la primera', () => {
    load({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
    expect(root().textContent).toContain('Todavía no hay jornadas');
    expect(root().querySelector('a[href="/jornadas/nueva"][empty-action]')).not.toBeNull();
  });

  describe('borrado', () => {
    async function confirm(): Promise<void> {
      load();
      (root().querySelector(`[aria-label="Eliminar la jornada ${item.name}"]`) as HTMLButtonElement).click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      overlayButton('Eliminar').click();
      await wait();
    }

    it('borra tras confirmar y recarga', async () => {
      await confirm();
      respondWith(http.expectOne((r) => r.method === 'DELETE' && r.url === `/gateway/journeys/${item.id}`), fx(remove));
      fixture.detectChanges();
      expect(root().textContent).toContain('Se eliminó jornada «Postman journey»');
      reloadAnswer();
    });

    it('un error del gateway se muestra y la jornada permanece', async () => {
      await confirm();
      http.expectOne((r) => r.method === 'DELETE').flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('El servicio no está disponible');
      expect(root().textContent).toContain('Postman journey');
    });

    it('si ya no existe (404) avisa y recarga', async () => {
      await confirm();
      http.expectOne((r) => r.method === 'DELETE').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      reloadAnswer();
    });
  });
});

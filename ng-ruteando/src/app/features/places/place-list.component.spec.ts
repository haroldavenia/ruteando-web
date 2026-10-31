import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { iconButtonsWithoutTitle } from '../../../testing/icon-button-titles';
import { TEST_MAP_CONFIG } from '../../../testing/map';
import { Fixture, respondWith } from '../../../testing/api-testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { MAP_CONFIG } from '../../shared/map/map-config';

import { PlaceListComponent } from './place-list.component';
import { PlacesMapComponent } from './places-map.component';

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
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
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

  it('las acciones de fila, que son solo un icono, llevan título con lo que hacen', () => {
    load();
    expect(root().querySelectorAll('.mat-mdc-icon-button').length).toBeGreaterThan(1);
    expect(iconButtonsWithoutTitle(root())).toEqual([]);
  });

  it('bajo el título dice cuántos hay y crear es la acción principal de la pantalla', () => {
    load();
    expect(root().querySelector('app-page-header .subtitle')?.textContent?.trim()).toMatch(/^\d+ (lugar|lugares)$/);
    expect(root().querySelectorAll('app-page-header .primary-action').length).toBe(1);
  });

  describe('mapa y chips de tipo', () => {
    const base = (fx(list).response.body as { content: object[] }).content[0];
    const withTypes = (types: string[]) => ({
      content: types.map((type, i) => ({ ...base, id: 'l' + i, name: 'L' + i, type })),
      totalElements: types.length,
      totalPages: 1,
      page: 0,
      size: 100,
    });
    const answer = (body: object) => {
      http.expectOne((r) => r.url === '/gateway/places').flush(body);
      fixture.detectChanges();
    };
    const map = () => fixture.debugElement.query(By.directive(PlacesMapComponent));

    it('pide los lugares de 100 en 100 para tenerlos todos', () => {
      const req = http.expectOne((r) => r.url === '/gateway/places');
      expect(req.request.params.get('size')).toBe('100');
      req.flush(fx(list).response.body as object);
    });

    it('con lugares muestra el mapa junto a la lista, en una vista dividida', () => {
      answer(withTypes(['depot', 'store']));

      expect(root().querySelector('.split-view')).not.toBeNull();
      expect(root().querySelector('#places-map-title')?.textContent).toBe('Mapa de los lugares');
      expect(map()).not.toBeNull();
      expect((map().componentInstance as PlacesMapComponent).places().length).toBe(2);
    });

    it('sin lugares no hay mapa, solo el mensaje de lista vacía', () => {
      answer({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 100 });

      expect(map()).toBeNull();
      expect(root().querySelector('.split-view')).toBeNull();
      expect(root().textContent).toContain('Todavía no hay lugares');
    });

    it('los chips de tipo cuentan los lugares y al elegir uno el mapa muestra solo esos', () => {
      answer(withTypes(['depot', 'store', 'store']));
      const chips = Array.from(root().querySelectorAll('.chips .chip')) as HTMLButtonElement[];

      expect(chips.map((c) => c.textContent!.replace(/\s+/g, ' ').trim())).toEqual(['Todos 3', 'Depósito 1', 'Tienda 2']);
      expect(root().querySelector('.chips')?.getAttribute('aria-label')).toBe('Tipo');

      chips[2].click();
      fixture.detectChanges();

      expect((map().componentInstance as PlacesMapComponent).places().map((p) => p.id)).toEqual(['l1', 'l2']);
    });

    it('al buscar, el mapa muestra solo los lugares que cumplen la búsqueda', () => {
      answer(withTypes(['depot', 'store', 'store']));
      const input = root().querySelector('input[type="search"]') as HTMLInputElement;
      input.value = 'l2';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect((map().componentInstance as PlacesMapComponent).places().map((p) => p.id)).toEqual(['l2']);
      expect(input.placeholder).toBe('Buscar por nombre o dirección');
    });

    it('al elegir un pin muestra la ficha del lugar con su tipo y un enlace para editarlo, y se puede cerrar', () => {
      answer(withTypes(['depot', 'store']));
      map().triggerEventHandler('placeSelect', 'l1');
      fixture.detectChanges();

      const ficha = root().querySelector('.ficha')!;
      expect(ficha.textContent).toContain('L1');
      expect(ficha.textContent).toContain('Tienda');
      expect(ficha.querySelector('a')?.getAttribute('href')).toBe('/lugares/l1');
      expect((map().componentInstance as PlacesMapComponent).selectedId()).toBe('l1');

      (ficha.querySelector('button[aria-label="Cerrar la ficha del lugar"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(root().querySelector('.ficha')).toBeNull();
    });
  });

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

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TEST_MAP_CONFIG } from '../../../testing/map';
import { toPlannedJourney } from '../../core/api/journey-mapper';
import { DomainRoute, Journey } from '../../core/api/models';
import { MAP_CONFIG } from '../../shared/map/map-config';
import { OPENLAYERS_LOADER } from '../../shared/map/openlayers';

import { RoutesMapComponent } from './routes-map.component';

import plan from '../../../testing/fixtures/gateway/post__journeys__plan.json';

const route = toPlannedJourney(plan.response.body as unknown as Journey).routes[0];
const wait = () => new Promise((resolve) => setTimeout(resolve, 150));

function create(routes: readonly DomainRoute[], providers: unknown[] = []) {
  TestBed.configureTestingModule({
    imports: [RoutesMapComponent],
    providers: [provideRouter([]), { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG }, ...(providers as [])],
  });
  const fixture = TestBed.createComponent(RoutesMapComponent);
  fixture.componentRef.setInput('routes', routes);
  fixture.detectChanges();
  return fixture;
}

describe('RoutesMapComponent: servidor, fallos y vacío', () => {
  it('en el servidor deja solo el hueco del mapa: no carga OpenLayers ni falla', async () => {
    const loader = jasmine.createSpy('loader').and.rejectWith(new Error('no debería llamarse'));
    const fixture = create([route], [
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: OPENLAYERS_LOADER, useValue: loader },
    ]);
    await wait();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(loader).not.toHaveBeenCalled();
    expect(fixture.componentInstance.olMap()).toBeNull();
    expect(root.querySelector('.map')).not.toBeNull();
    expect(root.querySelector('.ol-viewport')).toBeNull();
    expect(root.querySelector('p.error')).toBeNull();
    // La leyenda sí se pinta en servidor: es la alternativa al mapa
    expect(root.querySelectorAll('.legend .item').length).toBe(1);
  });

  it('si OpenLayers no se puede cargar avisa y la leyenda sigue funcionando', async () => {
    const fixture = create([route], [{ provide: OPENLAYERS_LOADER, useValue: () => Promise.reject(new Error('sin red')) }]);
    await wait();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar el mapa');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('tablas de rutas y paradas');
    expect(fixture.componentInstance.olMap()).toBeNull();

    (root.querySelector('.legend .item') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedRoute()).toBe(route.routeIndex);
  });

  it('sin rutas muestra el aviso, el mapa en su posición por defecto y una leyenda vacía', async () => {
    const fixture = create([]);
    for (let i = 0; i < 100 && !fixture.componentInstance.olMap(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="status"]')?.textContent).toContain('No hay rutas con recorrido ni paradas');
    expect(root.querySelectorAll('.legend .item').length).toBe(0);
    expect(fixture.componentInstance.olMap()).not.toBeNull();
  });

  it('con rutas que no tienen geometría ni paradas con posición también avisa', async () => {
    const empty = { ...route, geometry: [], waypoints: route.waypoints.map((w) => ({ ...w, position: null })) } as DomainRoute;
    const fixture = create([empty]);
    await wait();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay rutas con recorrido ni paradas');
  });

  it('con rutas dibujables no muestra el aviso de vacío', async () => {
    const fixture = create([route]);
    await wait();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('No hay rutas con recorrido');
  });

  it('la región del mapa tiene una etiqueta en español que remite a las tablas', () => {
    const fixture = create([route]);
    const region = (fixture.nativeElement as HTMLElement).querySelector('[role="region"]')!;
    expect(region.getAttribute('aria-label')).toContain('Mapa de las rutas de la jornada');
    expect(region.getAttribute('aria-label')).toContain('tablas de más abajo');
  });
});

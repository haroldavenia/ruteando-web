import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TEST_MAP_CONFIG } from '../../../testing/map';

import { MAP_CONFIG } from './map-config';
import { MapViewComponent } from './map-view.component';
import { OPENLAYERS_LOADER } from './openlayers';


describe('MapViewComponent: servidor y fallos', () => {
  const wait = () => new Promise((resolve) => setTimeout(resolve, 150));

  it('en el servidor deja solo el hueco del mapa: no carga OpenLayers ni falla', async () => {
    const loader = jasmine.createSpy('loader').and.rejectWith(new Error('no debería llamarse'));
    TestBed.configureTestingModule({
      imports: [MapViewComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        { provide: OPENLAYERS_LOADER, useValue: loader },
      ],
    });
    const fixture = TestBed.createComponent(MapViewComponent);
    fixture.componentRef.setInput('ariaLabel', 'Mapa para elegir la ubicación');
    fixture.detectChanges();
    await wait();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(loader).not.toHaveBeenCalled();
    expect(fixture.componentInstance.olMap()).toBeNull();
    expect(root.querySelector('.map')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector('.ol-viewport')).toBeNull();
  });

  it('si OpenLayers no se puede cargar avisa en español y no lanza', async () => {
    TestBed.configureTestingModule({
      imports: [MapViewComponent],
      providers: [
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        { provide: OPENLAYERS_LOADER, useValue: () => Promise.reject(new Error('sin red')) },
      ],
    });
    const fixture = TestBed.createComponent(MapViewComponent);
    fixture.detectChanges();
    await wait();
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudo cargar el mapa');
    expect(alert?.textContent).toContain('campos de coordenadas');
    expect(fixture.componentInstance.olMap()).toBeNull();
  });

  it('dos llamadas seguidas comparten la misma carga de OpenLayers', async () => {
    const { loadOpenLayers } = await import('./openlayers');
    expect(loadOpenLayers()).toBe(loadOpenLayers());
  });
});

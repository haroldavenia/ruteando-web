import { ChangeDetectionStrategy, Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { TEST_MAP_CONFIG } from '../../../testing/map';
import { LatLng } from '../../core/geo/lat-lng';

import { MAP_CONFIG } from './map-config';
import { OPENLAYERS_LOADER } from './openlayers';
import { PolygonEditorComponent } from './polygon-editor.component';
import { SQUARE } from './polygon-editor.component.spec';

@Component({
  imports: [PolygonEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-polygon-editor [(vertices)]="vertices" />`,
})
class HostComponent {
  readonly vertices = signal<LatLng[]>(SQUARE);
}

const wait = () => new Promise((resolve) => setTimeout(resolve, 150));

describe('PolygonEditorComponent: servidor y fallos', () => {
  it('en el servidor deja el hueco del mapa, no carga OpenLayers y pinta la tabla', async () => {
    const loader = jasmine.createSpy('loader').and.rejectWith(new Error('no debería llamarse'));
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        { provide: OPENLAYERS_LOADER, useValue: loader },
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await wait();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(loader).not.toHaveBeenCalled();
    expect(root.querySelector('.map')).not.toBeNull();
    expect(root.querySelector('.ol-viewport')).toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelectorAll('app-vertex-table tbody tr').length).toBe(4);
    expect((Array.from(root.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Dibujar polígono'))!.disabled).toBeTrue();
  });

  it('si OpenLayers no se carga avisa y la tabla permite crear el polígono entero', async () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        { provide: OPENLAYERS_LOADER, useValue: () => Promise.reject(new Error('sin red')) },
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.vertices.set([]);
    fixture.detectChanges();
    await wait();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar el mapa');

    const add = (Array.from(root.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Añadir vértice'))!;
    const triangle: [number, number][] = [[4.5, -74.1], [4.5, -74.0], [4.7, -74.05]];
    triangle.forEach(([lat, lng], i) => {
      add.click();
      fixture.detectChanges();
      for (const [label, value] of [[`Latitud del vértice ${i + 1}`, lat], [`Longitud del vértice ${i + 1}`, lng]] as const) {
        const input = root.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
        input.value = String(value);
        input.dispatchEvent(new Event('input'));
      }
      fixture.detectChanges();
    });
    expect(fixture.componentInstance.vertices().length).toBe(3);
    expect(root.querySelector('.summary')?.textContent).toContain('Polígono válido: 3 vértices');
  });
});

import { OverlayContainer } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Polygon from 'ol/geom/Polygon';
import { fromLonLat, toLonLat } from 'ol/proj';

import { TEST_MAP_CONFIG } from '../../../testing/map';
import { LatLng } from '../../core/geo/lat-lng';

import { MAP_CONFIG } from './map-config';
import { PolygonEditorComponent } from './polygon-editor.component';

export const SQUARE: LatLng[] = [
  { lat: 4.5, lng: -74.1 },
  { lat: 4.5, lng: -74.0 },
  { lat: 4.7, lng: -74.0 },
  { lat: 4.7, lng: -74.1 },
];

@Component({
  imports: [PolygonEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-polygon-editor [(vertices)]="vertices" [color]="color()" />`,
})
class HostComponent {
  readonly vertices = signal<LatLng[]>([]);
  readonly color = signal<string | null>(null);
}

describe('PolygonEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const editor = () => fixture.debugElement.query((d) => d.componentInstance instanceof PolygonEditorComponent).componentInstance as PolygonEditorComponent;
  const map = () => editor().olMap()!;
  const source = () => (map().getLayers().item(1) as VectorLayer<VectorSource>).getSource()!;
  const button = (text: string) => (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(text));
  const wait = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));
  const summary = () => root().querySelector('.summary')?.textContent?.trim();

  async function create(vertices: LatLng[] = []): Promise<void> {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations(), { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG }] });
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.vertices.set(vertices);
    root().style.width = '800px';
    fixture.detectChanges();
    for (let i = 0; i < 100 && !editor().olMap(); i++) {
      await wait(50);
    }
    expect(editor().olMap()).withContext('el mapa debería haberse creado').not.toBeNull();
    fixture.detectChanges();
  }
  const interaction = <T>(type: new (...args: never[]) => T): T | undefined => map().getInteractions().getArray().find((i) => i instanceof type) as T | undefined;

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    fixture?.destroy();
  });

  describe('mostrar', () => {
    it('dibuja el polígono cerrado y la tabla lista sus vértices', async () => {
      await create(SQUARE);
      const feature = source().getFeatures()[0];
      expect(feature.getGeometry()!.getType()).toBe('Polygon');
      expect((feature.getGeometry() as Polygon).getCoordinates()[0].length).toBe(5);
      expect(root().querySelectorAll('app-vertex-table tbody tr').length).toBe(4);
    });

    it('sin vértices no hay geometría y el resumen lo dice', async () => {
      await create([]);
      expect(source().getFeatures().length).toBe(0);
      expect(summary()).toBe('Todavía no hay polígono.');
    });

    it('con uno o dos vértices dibuja un punto o una línea', async () => {
      await create([SQUARE[0]]);
      expect(source().getFeatures()[0].getGeometry()!.getType()).toBe('Point');
      fixture.componentInstance.vertices.set(SQUARE.slice(0, 2));
      fixture.detectChanges();
      expect(source().getFeatures()[0].getGeometry()!.getType()).toBe('LineString');
    });

    it('encuadra la vista en el polígono al cargarlo', async () => {
      await create(SQUARE);
      const extent = map().getView().calculateExtent(map().getSize());
      for (const v of SQUARE) {
        const [x, y] = fromLonLat([v.lng, v.lat]);
        expect(x >= extent[0] && x <= extent[2] && y >= extent[1] && y <= extent[3]).toBeTrue();
      }
    });

    it('un cambio desde la tabla actualiza el polígono del mapa', async () => {
      await create(SQUARE);
      const input = root().querySelector('input[aria-label="Latitud del vértice 3"]') as HTMLInputElement;
      input.value = '4.9';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      const top = (source().getFeatures()[0].getGeometry() as Polygon).getCoordinates()[0][2];
      expect(toLonLat(top)[1]).toBeCloseTo(4.9, 5);
      expect(fixture.componentInstance.vertices()[2].lat).toBe(4.9);
    });
  });

  describe('dibujar', () => {
    const points = SQUARE.map((v) => fromLonLat([v.lng, v.lat]));

    it('«Dibujar polígono» activa el dibujo, y «Terminar polígono» entrega los vértices', async () => {
      await create([]);
      button('Dibujar polígono')!.click();
      fixture.detectChanges();
      const draw = interaction(Draw)!;
      expect(draw).toBeDefined();
      expect(button('Terminar polígono')).toBeDefined();
      expect(root().textContent).toContain('Haz clic en el mapa');

      draw.appendCoordinates(points);
      button('Terminar polígono')!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.vertices().length).toBe(4);
      expect(fixture.componentInstance.vertices()[0].lat).toBeCloseTo(4.5, 5);
      expect(interaction(Draw)).toBeUndefined();
      expect(button('Dibujar polígono')).toBeDefined();
      expect(root().querySelectorAll('app-vertex-table tbody tr').length).toBe(4);
      expect(summary()).toContain('Polígono válido: 4 vértices');
    });

    it('«Cancelar» descarta lo dibujado y conserva el polígono anterior', async () => {
      await create(SQUARE);
      button('Dibujar polígono')!.click();
      fixture.detectChanges();
      interaction(Draw)!.appendCoordinates(points.slice(0, 3));
      button('Cancelar')!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.vertices()).toEqual(SQUARE);
      expect(interaction(Draw)).toBeUndefined();
      expect(source().getFeatures().length).toBe(1);
    });

    it('Escape cancela el dibujo', async () => {
      await create(SQUARE);
      button('Dibujar polígono')!.click();
      fixture.detectChanges();
      root().querySelector('app-polygon-editor')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(interaction(Draw)).toBeUndefined();
      expect(fixture.componentInstance.vertices()).toEqual(SQUARE);
    });

    it('mientras se dibuja no se arrastran vértices y al terminar se vuelve a poder', async () => {
      await create(SQUARE);
      button('Dibujar polígono')!.click();
      fixture.detectChanges();
      expect(interaction(Modify)!.getActive()).toBeFalse();
      button('Cancelar')!.click();
      expect(interaction(Modify)!.getActive()).toBeTrue();
    });
  });

  describe('arrastrar un vértice', () => {
    it('al terminar de arrastrar, la tabla y los vértices reflejan la nueva posición', async () => {
      await create(SQUARE);
      const geometry = source().getFeatures()[0].getGeometry() as Polygon;
      const ring = geometry.getCoordinates();
      ring[0][1] = fromLonLat([-73.95, 4.5]);
      geometry.setCoordinates(ring);
      interaction(Modify)!.dispatchEvent({ type: 'modifyend', features: source().getFeaturesCollection(), mapBrowserEvent: {} } as never);
      fixture.detectChanges();

      const vertices = fixture.componentInstance.vertices();
      expect(vertices.length).toBe(4);
      expect(vertices[1].lng).toBeCloseTo(-73.95, 5);
      expect((root().querySelector('input[aria-label="Longitud del vértice 2"]') as HTMLInputElement).value).toContain('-73.95');
    });

    it('no reconstruye la geometría mientras arrastra (mantiene la misma instancia)', async () => {
      await create(SQUARE);
      const before = source().getFeatures()[0];
      interaction(Modify)!.dispatchEvent({ type: 'modifyend', features: source().getFeaturesCollection(), mapBrowserEvent: {} } as never);
      fixture.detectChanges();
      expect(source().getFeatures()[0]).toBe(before);
    });
  });

  describe('borrar', () => {
    it('con más de tres vértices pide confirmación', async () => {
      await create(SQUARE);
      button('Borrar polígono')!.click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      expect(overlay.textContent).toContain('¿Quitar los 4 vértices del polígono?');
      expect(fixture.componentInstance.vertices().length).toBe(4);

      (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === 'Borrar')!.click();
      await wait();
      fixture.detectChanges();
      expect(fixture.componentInstance.vertices()).toEqual([]);
      expect(source().getFeatures().length).toBe(0);
    });

    it('«Conservar» no borra nada', async () => {
      await create(SQUARE);
      button('Borrar polígono')!.click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === 'Conservar')!.click();
      await wait();
      expect(fixture.componentInstance.vertices().length).toBe(4);
    });

    it('con tres vértices o menos borra sin preguntar', async () => {
      await create(SQUARE.slice(0, 3));
      button('Borrar polígono')!.click();
      fixture.detectChanges();
      expect(overlay.querySelector('app-confirm-dialog')).toBeNull();
      expect(fixture.componentInstance.vertices()).toEqual([]);
    });

    it('sin vértices el botón está desactivado', async () => {
      await create([]);
      expect(button('Borrar polígono')!.disabled).toBeTrue();
    });
  });

  describe('validación visible', () => {
    it('un polígono válido muestra vértices y área aproximada', async () => {
      await create(SQUARE);
      expect(summary()).toMatch(/^Polígono válido: 4 vértices, unos 24\d(,\d)? km² \(aproximado\)\.$/);
      expect(root().querySelector('.summary')?.getAttribute('aria-live')).toBe('polite');
      expect(root().querySelector('.summary')?.classList.contains('problem')).toBeFalse();
    });

    it('una pajarita indica entre qué lados se cruza y se marca como problema', async () => {
      await create([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 1, lng: 0 }, { lat: 0, lng: 1 }]);
      expect(summary()).toContain('Los lados 1 y 3 se cruzan');
      expect(root().querySelector('.summary')?.classList.contains('problem')).toBeTrue();
    });

    it('con dos vértices pide al menos tres', async () => {
      await create(SQUARE.slice(0, 2));
      expect(summary()).toContain('al menos tres vértices');
    });

    it('el color y la validez cambian el estilo de la capa', async () => {
      await create(SQUARE);
      fixture.componentInstance.color.set('#0072B2');
      fixture.detectChanges();
      const layer = map().getLayers().item(1) as VectorLayer<VectorSource>;
      const styles = layer.getStyleFunction()!(source().getFeatures()[0], 1) as unknown as { getStroke(): { getColor(): string; getLineDash(): number[] | null } }[];
      expect(styles.at(-1)!.getStroke().getColor()).toBe('#0072B2');
      expect(styles.at(-1)!.getStroke().getLineDash()).toBeNull();

      fixture.componentInstance.vertices.set([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 1, lng: 0 }, { lat: 0, lng: 1 }]);
      fixture.detectChanges();
      const bad = layer.getStyleFunction()!(source().getFeatures()[0], 1) as unknown as { getStroke(): { getColor(): string; getLineDash(): number[] | null } }[];
      expect(bad.at(-1)!.getStroke().getColor()).toBe('#b3261e');
      expect(bad.at(-1)!.getStroke().getLineDash()).toEqual([10, 8]);
    });

    it('la atribución del proveedor es visible', async () => {
      await create(SQUARE);
      expect(root().querySelector('.ol-attribution')?.textContent).toContain('OpenStreetMap contributors');
    });
  });
});

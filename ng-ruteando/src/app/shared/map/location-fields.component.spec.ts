import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import Point from 'ol/geom/Point';

import { TEST_MAP_CONFIG } from '../../../testing/map';

import { LocationFieldsComponent, LocationGroup, createLocationGroup } from './location-fields.component';
import { MAP_CONFIG } from './map-config';
import { MapViewComponent } from './map-view.component';
import { OPENLAYERS_LOADER } from './openlayers';

@Component({
  imports: [LocationFieldsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-location-fields [location]="location" />`,
})
class HostComponent {
  location: LocationGroup = createLocationGroup();
}

describe('LocationFieldsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const input = (label: string) =>
    Array.from(root().querySelectorAll('mat-form-field')).find((f) => f.querySelector('mat-label')?.textContent === label)!.querySelector('input') as HTMLInputElement;
  const type = (label: string, value: string) => {
    const el = input(label);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const mapView = () => fixture.debugElement.query((d) => d.componentInstance instanceof MapViewComponent).componentInstance as MapViewComponent;
  const markerLatLng = (): [number, number] | null => {
    const layer = mapView().olMap()!.getLayers().item(1) as VectorLayer<VectorSource>;
    const geometry = layer.getSource()!.getFeatures()[0].getGeometry() as Point | undefined;
    const [lon, lat] = geometry ? toLonLat(geometry.getCoordinates()) : [NaN, NaN];
    return geometry ? [lat, lon] : null;
  };
  const settle = async () => {
    for (let i = 0; i < 100 && !mapView().olMap(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    fixture.detectChanges();
  };

  async function create(group?: LocationGroup, extra: unknown[] = []): Promise<void> {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [{ provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG }, ...(extra as [])] });
    fixture = TestBed.createComponent(HostComponent);
    if (group) {
      fixture.componentInstance.location = group;
    }
    fixture.detectChanges();
    await settle();
  }

  describe('disposición', () => {
    it('los campos van primero en el orden de lectura y el mapa después, también cuando se ven lado a lado', async () => {
      await create();
      const coordinates = root().querySelector('.coordinates')!;
      const map = root().querySelector('app-map-view')!;

      expect(coordinates.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('desde 720px el mapa queda a la derecha de los campos y los campos van uno sobre otro', async () => {
      if (!window.matchMedia('(min-width: 720px)').matches) {
        pending('la ventana de pruebas es estrecha: aquí van uno sobre otro');
      }
      await create();
      const coordinates = root().querySelector('.coordinates') as HTMLElement;
      const map = root().querySelector('app-map-view') as HTMLElement;
      const [lat, lng] = Array.from(coordinates.querySelectorAll('mat-form-field')).map((f) => f.getBoundingClientRect());

      expect(map.getBoundingClientRect().left).toBeGreaterThanOrEqual(coordinates.getBoundingClientRect().right);
      expect(lng.top).toBeGreaterThanOrEqual(lat.bottom - 1);
    });

    it('en pantallas estrechas el mapa va debajo de los campos', async () => {
      if (window.matchMedia('(min-width: 720px)').matches) {
        pending('la ventana de pruebas es ancha: aquí van lado a lado');
      }
      await create();

      expect(root().querySelector('app-map-view')!.getBoundingClientRect().top).toBeGreaterThanOrEqual(root().querySelector('.coordinates')!.getBoundingClientRect().bottom);
    });
  });

  it('escribir latitud y longitud válidas mueve el marcador', async () => {
    await create();
    type('Latitud', '4.60872');
    type('Longitud', '-74.07728');

    expect(markerLatLng()![0]).toBeCloseTo(4.60872, 5);
    expect(markerLatLng()![1]).toBeCloseTo(-74.07728, 5);
  });

  it('hacer clic en el mapa rellena los campos y marca el grupo como modificado', async () => {
    await create();
    mapView().olMap()!.dispatchEvent({ type: 'click', coordinate: fromLonLat([-75.5, 6.25]) } as never);
    fixture.detectChanges();

    expect(fixture.componentInstance.location.value).toEqual({ lat: 6.25, lng: -75.5 });
    expect(input('Latitud').value).toBe('6.25');
    expect(fixture.componentInstance.location.dirty).toBeTrue();
  });

  it('con valores iniciales muestra el marcador en ellos', async () => {
    await create(createLocationGroup({ lat: 4.60872, lng: -74.07728 }));
    expect(markerLatLng()![0]).toBeCloseTo(4.60872, 5);
  });

  it('una latitud de 91 y una longitud de 181 dan error y no mueven el marcador', async () => {
    await create(createLocationGroup({ lat: 4.6, lng: -74.1 }));
    type('Latitud', '91');
    type('Longitud', '181');
    fixture.componentInstance.location.markAllAsTouched();
    fixture.detectChanges();

    expect(root().textContent).toContain('La latitud debe estar entre -90 y 90');
    expect(root().textContent).toContain('La longitud debe estar entre -180 y 180');
    expect(markerLatLng()![0]).toBeCloseTo(4.6, 5);
    expect(markerLatLng()![1]).toBeCloseTo(-74.1, 5);
  });

  it('un par incompleto no mueve el marcador y marca los obligatorios', async () => {
    await create(createLocationGroup({ lat: 4.6, lng: -74.1 }));
    type('Longitud', '');
    fixture.componentInstance.location.markAllAsTouched();
    fixture.detectChanges();

    expect(root().textContent).toContain('Este campo es obligatorio');
    expect(markerLatLng()![1]).toBeCloseTo(-74.1, 5);
  });

  it('los campos van antes que el mapa y el mapa explica que existe la alternativa', async () => {
    await create();
    const inputs = Array.from(root().querySelectorAll('input'));
    const region = root().querySelector('[role="region"]')!;
    expect(inputs[0].compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(region.getAttribute('aria-label')).toContain('escribir la latitud y la longitud');
  });

  it('con el mapa fallido los campos siguen funcionando', async () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        { provide: OPENLAYERS_LOADER, useValue: () => Promise.reject(new Error('sin red')) },
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 150));
    fixture.detectChanges();

    type('Latitud', '4.5');
    type('Longitud', '-74.1');
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar el mapa');
    expect(fixture.componentInstance.location.value).toEqual({ lat: 4.5, lng: -74.1 });
    expect(fixture.componentInstance.location.valid).toBeTrue();
  });
});

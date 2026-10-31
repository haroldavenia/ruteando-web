import { ComponentFixture, TestBed } from '@angular/core/testing';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';

import { TEST_MAP_CONFIG } from '../../../testing/map';
import { Place } from '../../core/api/models';
import { MAP_CONFIG } from '../../shared/map/map-config';
import { OPENLAYERS_LOADER } from '../../shared/map/openlayers';

import { PlacesMapComponent } from './places-map.component';

import list from '../../../testing/fixtures/gateway/get__places.json';

const base = (list.response.body as unknown as { content: Place[] }).content[0];
const place = (id: string, type: string, lng: number, lat: number): Place => ({ ...base, id, type, location: { type: 'Point', coordinates: [lng, lat] } });

describe('PlacesMapComponent', () => {
  let fixture: ComponentFixture<PlacesMapComponent>;
  const root = () => fixture.nativeElement as HTMLElement;

  async function create(places: Place[], selectedId: string | null = null): Promise<void> {
    TestBed.configureTestingModule({ imports: [PlacesMapComponent], providers: [{ provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG }] });
    fixture = TestBed.createComponent(PlacesMapComponent);
    fixture.componentRef.setInput('places', places);
    fixture.componentRef.setInput('selectedId', selectedId);
    root().style.setProperty('--app-map-height', '300px');
    root().style.display = 'block';
    root().style.width = '500px';
    fixture.detectChanges();
    await ready();
  }

  async function ready(): Promise<void> {
    for (let i = 0; i < 100 && !fixture.componentInstance.olMap(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(fixture.componentInstance.olMap()).withContext('el mapa debería haberse creado').not.toBeNull();
    fixture.detectChanges();
  }

  const source = () =>
    (fixture.componentInstance.olMap()!.getLayers().getArray().find((l) => l.constructor.name === 'VectorLayer') as VectorLayer<VectorSource>).getSource()!;
  const legend = () => Array.from(root().querySelectorAll('.legend li')).map((li) => li.textContent!.trim());

  const three = [place('a', 'depot', -74.08, 4.6), place('b', 'store', -74.1, 4.65), place('c', 'store', -74.05, 4.7)];

  it('dibuja un pin por lugar y lo ajusta para que se vean todos', async () => {
    await create(three);
    const features = source().getFeatures();

    expect(features.map((f) => f.get('id')).sort()).toEqual(['a', 'b', 'c']);
    const map = fixture.componentInstance.olMap()!;
    const extent = map.getView().calculateExtent(map.getSize());
    for (const f of features) {
      const [x, y] = (f.getGeometry() as unknown as { getCoordinates(): number[] }).getCoordinates();
      expect(x >= extent[0] && x <= extent[2] && y >= extent[1] && y <= extent[3]).withContext('el pin ' + f.get('id') + ' está a la vista').toBeTrue();
    }
  });

  it('la leyenda dice el tipo de cada color con su letra, solo de los tipos que hay', async () => {
    await create(three);

    expect(legend()).toEqual(['DDepósito', 'TTienda']);
    expect(root().querySelector('.legend')?.getAttribute('aria-label')).toBe('Tipos de lugar');
    expect(root().querySelector('.legend .pin')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('un tipo desconocido tiene su pin y su leyenda con su clave', async () => {
    await create([place('a', 'depot', -74.08, 4.6), place('z', 'kiosco', -74.1, 4.65)]);

    expect(legend()).toEqual(['DDepósito', 'Kkiosco']);
  });

  it('omite los lugares sin ubicación válida', async () => {
    await create([...three, { ...place('x', 'store', 0, 0), location: { type: 'Point', coordinates: [] as unknown as [number, number] } }]);

    expect(source().getFeatures().length).toBe(3);
  });

  it('al cambiar los lugares dibuja los nuevos y quita los anteriores', async () => {
    await create(three);
    fixture.componentRef.setInput('places', [three[0]]);
    fixture.detectChanges();

    expect(source().getFeatures().map((f) => f.get('id'))).toEqual(['a']);
    expect(legend()).toEqual(['DDepósito']);
  });

  it('con el mapa a oscuras para teclado, ofrece una región con nombre y la lista queda como alternativa', async () => {
    await create(three);

    expect(root().querySelector('.map')?.getAttribute('role')).toBe('region');
    expect(root().querySelector('.map')?.getAttribute('aria-label')).toContain('Mapa de los lugares');
  });

  it('si OpenLayers no carga lo dice y deja usar la lista', async () => {
    TestBed.configureTestingModule({
      imports: [PlacesMapComponent],
      providers: [{ provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG }, { provide: OPENLAYERS_LOADER, useValue: () => Promise.reject(new Error('sin red')) }],
    });
    fixture = TestBed.createComponent(PlacesMapComponent);
    fixture.componentRef.setInput('places', three);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 100));
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar el mapa');
  });
});

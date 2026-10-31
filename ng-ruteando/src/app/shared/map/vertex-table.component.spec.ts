import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LatLng } from '../../core/geo/lat-lng';

import { VertexTableComponent } from './vertex-table.component';

const square: LatLng[] = [
  { lat: 4.5, lng: -74.1 },
  { lat: 4.5, lng: -74.0 },
  { lat: 4.7, lng: -74.0 },
  { lat: 4.7, lng: -74.1 },
];

@Component({
  imports: [VertexTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-vertex-table [(vertices)]="vertices" />`,
})
class HostComponent {
  readonly vertices = signal<LatLng[]>(square);
}

describe('VertexTableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const input = (label: string) => root().querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
  const type = (label: string, value: string) => {
    const el = input(label);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const host = () => fixture.componentInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('lista cada vértice numerado con su latitud y su longitud, bajo un título', () => {
    expect(root().querySelector('caption')?.textContent).toContain('Vértices del polígono');
    expect(root().querySelectorAll('tbody tr').length).toBe(4);
    expect(Array.from(root().querySelectorAll('tbody th')).map((th) => th.textContent!.trim())).toEqual(['1', '2', '3', '4']);
    expect(input('Latitud del vértice 3').value).toBe('4.7');
    expect(input('Longitud del vértice 3').value).toBe('-74');
    expect(Array.from(root().querySelectorAll('thead th')).map((th) => th.getAttribute('scope'))).toEqual(['col', 'col', 'col', 'col']);
  });

  it('en una caja estrecha cada vértice es una tarjeta: sus campos caben y la tabla no se desplaza', () => {
    const row = root().querySelector('tbody tr') as HTMLElement;
    expect(Array.from(row.querySelectorAll('td')).map((td) => td.getAttribute('data-label'))).toEqual(['Latitud', 'Longitud', null]);

    root().style.display = 'block';
    root().style.width = '320px';
    const box = root().querySelector('.stack-scope') as HTMLElement;
    expect(getComputedStyle(row).display).toBe('grid');
    expect(getComputedStyle(box.querySelector('caption')!).display).toBe('block');
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
    expect(input('Latitud del vértice 1').getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right);
  });

  it('editar una coordenada válida actualiza los vértices', () => {
    type('Latitud del vértice 2', '4.55');
    expect(host().vertices()[1]).toEqual({ lat: 4.55, lng: -74 });
    expect(host().vertices().length).toBe(4);
  });

  it('una latitud o longitud fuera de rango muestra el error y no cambia la lista', () => {
    type('Latitud del vértice 1', '91');
    type('Longitud del vértice 4', '-181');
    expect(host().vertices()).toEqual(square);
    const errors = Array.from(root().querySelectorAll('.error')).map((e) => e.textContent!.trim());
    expect(errors).toEqual(['Entre -90 y 90', 'Entre -180 y 180']);
    expect(input('Latitud del vértice 1').getAttribute('aria-invalid')).toBe('true');
  });

  it('un campo vacío es obligatorio y no cambia la lista', () => {
    type('Longitud del vértice 2', '');
    expect(root().querySelector('.error')?.textContent).toContain('Obligatorio');
    expect(host().vertices()).toEqual(square);
  });

  it('al corregir el valor vuelve a propagarse', () => {
    type('Latitud del vértice 1', '91');
    type('Latitud del vértice 1', '4.4');
    expect(host().vertices()[0].lat).toBe(4.4);
    expect(root().querySelector('.error')).toBeNull();
  });

  it('«Añadir vértice» añade uno al final entre el último y el primero, con etiquetas que lo nombran', () => {
    (Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.includes('Añadir vértice')) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host().vertices().length).toBe(5);
    expect(input('Latitud del vértice 5')).not.toBeNull();
    expect(host().vertices()[4].lat).toBeCloseTo((4.5 + 4.7) / 2, 6);
  });

  it('añadir un vértice con la tabla vacía crea una fila vacía que no entra en la lista hasta rellenarla', () => {
    host().vertices.set([]);
    fixture.detectChanges();
    expect(root().textContent).toContain('Todavía no hay vértices');
    (Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.includes('Añadir vértice')) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host().vertices()).toEqual([]);
    type('Latitud del vértice 1', '4.6');
    type('Longitud del vértice 1', '-74.05');
    expect(host().vertices()).toEqual([{ lat: 4.6, lng: -74.05 }]);
  });

  it('el botón de quitar tiene una etiqueta que nombra el vértice y lo elimina', () => {
    const remove = root().querySelector('button[aria-label="Quitar el vértice 2"]') as HTMLButtonElement;
    expect(remove).not.toBeNull();
    remove.click();
    fixture.detectChanges();
    expect(host().vertices()).toEqual([square[0], square[2], square[3]]);
    expect(root().querySelector('input[aria-label="Latitud del vértice 4"]')).toBeNull();
  });

  it('un cambio que llega desde fuera (el mapa) se refleja en la tabla', () => {
    host().vertices.set([...square.slice(0, 3), { lat: 4.8, lng: -74.2 }]);
    fixture.detectChanges();
    expect(input('Latitud del vértice 4').value).toBe('4.8');
    expect(input('Longitud del vértice 4').value).toBe('-74.2');
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PageHeaderComponent } from './page-header.component';

@Component({
  imports: [PageHeaderComponent],
  template: `<app-page-header title="Vehículos"><button type="button">Nuevo vehículo</button></app-page-header>`,
})
class HostComponent {}

describe('PageHeaderComponent', () => {
  it('muestra el título como h1 y la acción principal proyectada', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toBe('Vehículos');
    expect(root.querySelector('button')?.textContent).toBe('Nuevo vehículo');
  });
});

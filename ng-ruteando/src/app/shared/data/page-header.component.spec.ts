import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PageHeaderComponent } from './page-header.component';

@Component({
  imports: [PageHeaderComponent],
  template: `<app-page-header title="Vehículos"><button type="button">Nuevo vehículo</button></app-page-header>`,
})
class HostComponent {}

@Component({
  imports: [PageHeaderComponent],
  template: `<app-page-header title="Vehículos" subtitle="Tu flota de reparto" />`,
})
class SubtitleHostComponent {}

describe('PageHeaderComponent', () => {
  it('muestra el título como h1 y la acción principal proyectada', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toBe('Vehículos');
    expect(root.querySelector('button')?.textContent).toBe('Nuevo vehículo');
  });

  it('muestra un subtítulo opcional bajo el título y no lo pinta si falta', () => {
    const withSubtitle = TestBed.createComponent(SubtitleHostComponent);
    withSubtitle.detectChanges();
    expect((withSubtitle.nativeElement as HTMLElement).querySelector('.subtitle')?.textContent).toBe('Tu flota de reparto');

    const without = TestBed.createComponent(HostComponent);
    without.detectChanges();
    expect((without.nativeElement as HTMLElement).querySelector('.subtitle')).toBeNull();
  });

  it('no declara por su cuenta el estilo del título: lo toma del sistema de interfaz', () => {
    const styles = ((PageHeaderComponent as unknown as { ɵcmp: { styles?: string[] } }).ɵcmp.styles ?? []).join('\n');
    expect(styles).not.toMatch(/h1/);
  });
});

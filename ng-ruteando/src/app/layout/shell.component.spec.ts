import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let breakpoints: Subject<BreakpointState>;

  beforeEach(async () => {
    breakpoints = new Subject<BreakpointState>();
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: BreakpointObserver, useValue: { observe: () => breakpoints.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    // afterNextRender se ejecuta tras un ciclo de la aplicación
    TestBed.inject(ApplicationRef).tick();
  });

  it('se crea', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renderiza el enlace "Inicio" del menú', () => {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    expect(links.some((a) => a.textContent?.includes('Inicio'))).toBeTrue();
  });

  it('usa el menú fijo en pantalla ancha y desplegable en estrecha', () => {
    expect(fixture.componentInstance.mode()).toBe('side');

    breakpoints.next({ matches: false, breakpoints: {} });
    expect(fixture.componentInstance.mode()).toBe('over');

    breakpoints.next({ matches: true, breakpoints: {} });
    expect(fixture.componentInstance.mode()).toBe('side');
  });

  it('muestra el botón del menú solo en pantalla estrecha, con etiqueta en español', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('button[aria-label="Abrir menú de navegación"]')).toBeNull();

    breakpoints.next({ matches: false, breakpoints: {} });
    fixture.detectChanges();
    expect(root.querySelector('button[aria-label="Abrir menú de navegación"]')).not.toBeNull();
  });
});

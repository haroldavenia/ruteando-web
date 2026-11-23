import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { AppComponent } from './app.component';
import { API_BASE_URL } from './core/api/api-config';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideRouter([]),
        provideServiceWorker('ngsw-worker.js', { enabled: false }), // sin worker: SwUpdate existe pero no emite
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('se crea', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('solo contiene el outlet: el shell y las pantallas de acceso se cargan por ruta', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('router-outlet')).not.toBeNull();
    expect(el.querySelector('app-shell')).toBeNull();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AccessLayoutComponent } from './access-layout.component';

describe('AccessLayoutComponent', () => {
  it('muestra el nombre de la aplicación y el contenido enrutado, sin barra ni menú lateral', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'acceso',
            component: AccessLayoutComponent,
            children: [{ path: '', loadComponent: () => import('./forbidden.component').then((m) => m.ForbiddenComponent) }],
          },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/acceso');
    const root: HTMLElement = harness.routeNativeElement!.closest('app-access-layout') ?? harness.routeNativeElement!;

    expect(document.body.textContent).toContain('Ruteando');
    expect(document.querySelector('app-access-layout main')).not.toBeNull();
    expect(root.querySelector('router-outlet')).not.toBeNull();
    expect(document.querySelector('mat-toolbar')).toBeNull();
    expect(document.querySelector('mat-sidenav')).toBeNull();
  });
});

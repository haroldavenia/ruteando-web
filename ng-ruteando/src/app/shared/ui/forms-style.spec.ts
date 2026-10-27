import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { TEST_MAP_CONFIG } from '../../../testing/map';
import { API_BASE_URL } from '../../core/api/api-config';
import { DriverFormComponent } from '../../features/fleet/drivers/driver-form.component';
import { ResourceTypeFormComponent } from '../../features/fleet/resource-types/resource-type-form.component';
import { ResourceFormComponent } from '../../features/fleet/resources/resource-form.component';
import { JourneyFormComponent } from '../../features/journeys/journey-form.component';
import { PackageFormComponent } from '../../features/packages/package-form.component';
import { PackageImportComponent } from '../../features/packages/import/package-import.component';
import { PlaceFormComponent } from '../../features/places/place-form.component';
import { SettingsFormComponent } from '../../features/settings/settings-form.component';
import { ZoneFormComponent } from '../../features/zones/zone-form.component';
import { MAP_CONFIG } from '../map/map-config';

/** Formularios de alta y edición: cada uno es una tarjeta con las acciones al final. */
const FORMS: [string, Type<unknown>, boolean][] = [
  ['lugares', PlaceFormComponent, true],
  ['conductores', DriverFormComponent, true],
  ['tipos de vehículo', ResourceTypeFormComponent, true],
  ['vehículos', ResourceFormComponent, true],
  ['paquetes', PackageFormComponent, false],
  ['configuraciones', SettingsFormComponent, false],
  ['zonas', ZoneFormComponent, false],
  ['planificar jornada', JourneyFormComponent, false],
];

const ownStyles = (component: Type<unknown>): string => ((component as unknown as { ɵcmp: { styles?: string[] } }).ɵcmp.styles ?? []).join('\n');

describe('formularios en tarjeta', () => {
  const mounted: HTMLElement[] = [];

  function mount(component: Type<unknown>): HTMLElement {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [component],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const fixture = TestBed.createComponent(component);
    const host = document.createElement('div');
    host.className = 'page';
    document.body.appendChild(host);
    host.appendChild(fixture.nativeElement);
    mounted.push(host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => mounted.splice(0).forEach((m) => m.remove()));

  for (const [name, component, grid] of FORMS) {
    describe(name, () => {
      it('el formulario es una tarjeta con esquinas y borde comunes', () => {
        const form = mount(component).querySelector('form') as HTMLElement;
        expect(form.classList.contains('card')).toBeTrue();
        const style = getComputedStyle(form);
        expect(style.borderTopLeftRadius).toBe('20px');
        expect(style.borderTopWidth).toBe('1px');
      });

      it('las acciones están al final, separadas del contenido, y no hay estilos propios de título', () => {
        const root = mount(component);
        const actions = root.querySelector('form .form-actions') as HTMLElement;
        expect(actions).not.toBeNull();
        expect(getComputedStyle(actions).justifyContent).toMatch(/flex-end|end/);
        expect(getComputedStyle(actions).borderTopWidth).toBe('1px');
        expect(actions.querySelector('button[type="submit"]')).not.toBeNull();
        expect(ownStyles(component)).not.toMatch(/(^|\s)h1\s*\{/);
      });

      if (grid) {
        it('los campos se agrupan en una columna en pantalla estrecha y en dos desde 720px', () => {
          const form = mount(component).querySelector('form') as HTMLElement;
          expect(form.classList.contains('form-grid')).toBeTrue();
          const columns = getComputedStyle(form).gridTemplateColumns.split(' ').length;
          expect(columns).toBe(matchMedia('(min-width: 720px)').matches ? 2 : 1);
        });
      }
    });
  }

  it('el importador de CSV presenta cada paso en una tarjeta', () => {
    const root = mount(PackageImportComponent);
    const sections = Array.from(root.querySelectorAll('section'));
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.every((s) => s.classList.contains('card'))).toBeTrue();
  });
});

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

      it('el botón de enviar es la acción principal de la pantalla y es el único con el degradado de la marca', () => {
        const root = mount(component);
        const flat = Array.from(root.querySelectorAll('form button.mdc-button--unelevated, form a.mdc-button--unelevated'));
        const primary = Array.from(root.querySelectorAll('form .primary-action'));

        expect(primary.length).toBe(1);
        expect(primary[0].getAttribute('type')).toBe('submit');
        expect(flat.filter((b) => b.classList.contains('primary-action')).length).toBe(1);
        expect(getComputedStyle(primary[0]).backgroundImage).toContain('linear-gradient');
      });

      if (grid) {
        it('lleva la cabecera con la vuelta al listado, los campos en secciones con icono y la barra de acciones', () => {
          const root = mount(component);

          expect(root.querySelector('app-form-head a.back')).not.toBeNull();
          expect(root.querySelector('app-form-head h1')?.textContent?.trim().length).toBeGreaterThan(0);
          const sections = Array.from(root.querySelectorAll('form section.form-section'));
          expect(sections.length).toBeGreaterThan(0);
          for (const section of sections) {
            expect(section.querySelector(':scope > h2 mat-icon')).not.toBeNull();
          }
          expect(root.querySelector('form app-form-actions.form-actions')).not.toBeNull();
        });

        it('los campos se agrupan en una columna en pantalla estrecha y en dos desde 720px', () => {
          const form = mount(component).querySelector('form') as HTMLElement;
          expect(form.classList.contains('form-grid')).toBeTrue();
          const columns = getComputedStyle(form).gridTemplateColumns.split(' ').length;
          expect(columns).toBe(matchMedia('(min-width: 720px)').matches ? 2 : 1);
        });
      }
    });
  }

  describe('pistas bajo un campo', () => {
    it('van en el color del texto secundario, no en el del texto principal', () => {
      const root = mount(ResourceFormComponent);
      const hint = root.querySelector('mat-hint') as HTMLElement;
      const secondary = document.createElement('span');
      secondary.style.color = 'var(--mat-sys-on-surface-variant)';
      root.appendChild(secondary);

      expect(getComputedStyle(hint).color).toBe(getComputedStyle(secondary).color);
    });

    it('dejan sitio a la etiqueta flotante del campo de abajo, que asoma sobre su borde', () => {
      const root = mount(ResourceFormComponent);
      const hintField = (root.querySelector('mat-hint') as HTMLElement).closest('mat-form-field') as HTMLElement;
      const hintBox = hintField.getBoundingClientRect();
      const below = Array.from(root.querySelectorAll('form mat-form-field'))
        .map((f) => f.getBoundingClientRect())
        .filter((r) => r.top >= hintBox.bottom - 1 && r.left < hintBox.right && r.right > hintBox.left)
        .sort((a, b) => a.top - b.top)[0];

      expect(below).toBeDefined();
      expect(below.top - hintBox.bottom).toBeGreaterThanOrEqual(8);
    });
  });

  it('el importador de CSV presenta cada paso en una tarjeta', () => {
    const root = mount(PackageImportComponent);
    const sections = Array.from(root.querySelectorAll('section'));
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.every((s) => s.classList.contains('card'))).toBeTrue();
  });
});

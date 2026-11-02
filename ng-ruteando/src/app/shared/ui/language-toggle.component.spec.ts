import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { LANGUAGE_STORAGE_KEY } from '../../core/i18n/i18n';
import { PAGE_RELOAD, SWITCH_ANIMATION } from '../../core/i18n/language.service';

import { LanguageToggleComponent } from './language-toggle.component';

describe('LanguageToggleComponent', () => {
  let fixture: ComponentFixture<LanguageToggleComponent>;
  let reload: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  const radios = () => Array.from(root().querySelectorAll<HTMLButtonElement>('[role="radio"]'));

  function render(variant: 'segmented' | 'menu' = 'segmented'): void {
    reload = jasmine.createSpy('reload');
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations(), { provide: PAGE_RELOAD, useValue: reload }, { provide: SWITCH_ANIMATION, useValue: false }],
    });
    fixture = TestBed.createComponent(LanguageToggleComponent);
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
  }

  afterEach(() => localStorage.removeItem(LANGUAGE_STORAGE_KEY));

  describe('segmentado (pantallas de acceso)', () => {
    beforeEach(() => render());

    it('es un grupo de opciones con un nombre y un botón por idioma, con el actual marcado', () => {
      expect(root().querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Idioma');
      expect(radios().map((r) => r.textContent?.trim())).toEqual(['EN', 'ES', 'PT']);
      expect(radios().map((r) => r.getAttribute('aria-label'))).toEqual(['English', 'Español', 'Português']);
      expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    });

    it('solo el botón activo entra en el orden del teclado (las flechas mueven entre idiomas)', () => {
      expect(radios().map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    });

    it('cada botón lleva su nombre como title', () => {
      expect(radios().map((r) => r.getAttribute('title'))).toEqual(['English', 'Español', 'Português']);
    });

    it('el indicador se coloca sobre el idioma activo', () => {
      expect(root().querySelector<HTMLElement>('.opts')?.style.getPropertyValue('--i')).toBe('1');
    });

    it('elegir un idioma desliza el indicador, lo guarda y recarga', () => {
      radios()[2].click();
      fixture.detectChanges();
      expect(root().querySelector<HTMLElement>('.opts')?.style.getPropertyValue('--i')).toBe('2');
      expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt');
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('las flechas pasan al idioma siguiente y anterior, dando la vuelta en los extremos', () => {
      const group = root().querySelector('[role="radiogroup"]')!;
      group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      fixture.detectChanges();
      expect(radios()[2].getAttribute('aria-checked')).toBe('true');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt');
    });

    it('otras teclas no hacen nada', () => {
      root().querySelector('[role="radiogroup"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      expect(reload).not.toHaveBeenCalled();
    });
  });

  describe('menú (barra de la aplicación)', () => {
    beforeEach(() => render('menu'));

    it('una píldora con el idioma actual, con nombre accesible', () => {
      const trigger = root().querySelector<HTMLButtonElement>('button.pill')!;
      expect(trigger.getAttribute('aria-label')).toBe('Idioma');
      expect(trigger.getAttribute('title')).toBe('Idioma');
      expect(trigger.textContent).toContain('ES');
      expect(root().querySelector('[role="radiogroup"]')).toBeNull();
    });

    it('abre la lista con el nombre de cada idioma, marca el actual y cambia al elegir otro', async () => {
      root().querySelector<HTMLButtonElement>('button.pill')!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      TestBed.inject(ApplicationRef).tick();

      const overlay = TestBed.inject(OverlayContainer).getContainerElement();
      const items = Array.from(overlay.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
      expect(items.map((i) => i.querySelector('.name')?.textContent?.trim())).toEqual(['English', 'Español', 'Português']);
      expect(items.map((i) => i.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);

      items[0].click();
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });
});

import { TestBed } from '@angular/core/testing';

import { LANGUAGE_STORAGE_KEY, language } from './i18n';
import { LanguageService, PAGE_RELOAD, SWITCH_ANIMATION } from './language.service';

describe('LanguageService', () => {
  let reload: jasmine.Spy;

  function create(animated = false): LanguageService {
    reload = jasmine.createSpy('reload');
    TestBed.configureTestingModule({
      providers: [
        { provide: PAGE_RELOAD, useValue: reload },
        { provide: SWITCH_ANIMATION, useValue: animated },
      ],
    });
    return TestBed.inject(LanguageService);
  }

  afterEach(() => localStorage.removeItem(LANGUAGE_STORAGE_KEY));

  it('expone los tres idiomas y el de esta carga de la página', () => {
    const service = create();
    expect(service.languages).toEqual(['en', 'es', 'pt']);
    expect(service.current).toBe('es'); // las pruebas fijan el español
  });

  it('elegir otro idioma lo guarda y recarga la página una vez', () => {
    const service = create();
    service.set('pt');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt');
    expect(language()).toBe('pt');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('elegir el idioma que ya está no hace nada', () => {
    const service = create();
    service.set('es');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it('un segundo clic mientras cambia no recarga dos veces', () => {
    const service = create();
    service.set('en');
    service.set('pt');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('con movimiento permitido espera a que el selector se deslice antes de recargar', () => {
    jasmine.clock().install();
    try {
      const service = create(true);
      service.set('en');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
      expect(reload).not.toHaveBeenCalled();
    } finally {
      jasmine.clock().uninstall();
    }
  });
});

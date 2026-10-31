import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { THEME_STORAGE_KEY, ThemePreference, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  function create(platform = 'browser'): ThemeService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
    return TestBed.inject(ThemeService);
  }

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    root.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    root.removeAttribute('data-theme');
  });

  it('sin elección guardada sigue al sistema y no marca el documento', () => {
    const theme = create();
    expect(theme.preference()).toBe('system');
    expect(root.hasAttribute('data-theme')).toBeFalse();
  });

  it('al elegir oscuro o claro lo aplica al documento y lo guarda', () => {
    const theme = create();
    theme.set('dark');
    expect(theme.preference()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    theme.set('light');
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('al volver al sistema quita la marca del documento y olvida la elección', () => {
    const theme = create();
    theme.set('dark');
    theme.set('system');
    expect(theme.preference()).toBe('system');
    expect(root.hasAttribute('data-theme')).toBeFalse();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  for (const stored of ['light', 'dark'] as const) {
    it(`recupera la elección guardada («${stored}») y la aplica al arrancar`, () => {
      localStorage.setItem(THEME_STORAGE_KEY, stored);
      const theme = create();
      expect(theme.preference()).toBe(stored);
      expect(root.getAttribute('data-theme')).toBe(stored);
    });
  }

  it('ignora un valor guardado que no es una elección válida', () => {
    for (const invalid of ['system', 'azul', '', '{"a":1}']) {
      localStorage.setItem(THEME_STORAGE_KEY, invalid);
      const theme = create();
      expect(theme.preference()).withContext(invalid).toBe('system');
      expect(root.hasAttribute('data-theme')).withContext(invalid).toBeFalse();
    }
  });

  describe('esquema efectivo (scheme)', () => {
    /** Sustituye matchMedia por uno que el test controla; devuelve cómo cambiar el tema del sistema. */
    function fakeSystem(dark: boolean) {
      let listener: ((event: MediaQueryListEvent) => void) | null = null;
      const query = {
        matches: dark,
        addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => (listener = fn),
        removeEventListener: () => (listener = null),
      } as unknown as MediaQueryList;
      spyOn(window, 'matchMedia').and.returnValue(query);
      return {
        change: (next: boolean) => listener?.({ matches: next } as MediaQueryListEvent),
        listening: () => listener !== null,
      };
    }

    it('siguiendo al sistema es el del sistema, y cambia en vivo cuando el sistema cambia', () => {
      const system = fakeSystem(false);
      const theme = create();
      expect(theme.scheme()).toBe('light');
      system.change(true);
      expect(theme.scheme()).toBe('dark');
      system.change(false);
      expect(theme.scheme()).toBe('light');
    });

    it('una elección manual manda sobre el sistema, en los dos sentidos', () => {
      const system = fakeSystem(true);
      const theme = create();
      expect(theme.scheme()).toBe('dark');
      theme.set('light');
      expect(theme.scheme()).toBe('light');
      system.change(false);
      theme.set('dark');
      expect(theme.scheme()).toBe('dark');
      theme.set('system');
      expect(theme.scheme()).toBe('light');
    });

    it('con la elección guardada arranca ya con su esquema', () => {
      fakeSystem(false);
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(create().scheme()).toBe('dark');
    });

    it('deja de escuchar al sistema cuando se destruye el servicio', () => {
      const system = fakeSystem(false);
      create();
      expect(system.listening()).toBeTrue();
      TestBed.resetTestingModule();
      expect(system.listening()).toBeFalse();
    });

    it('en el servidor es claro y no consulta al sistema', () => {
      const matchMedia = spyOn(window, 'matchMedia').and.callThrough();
      expect(create('server').scheme()).toBe('light');
      expect(matchMedia).not.toHaveBeenCalled();
    });

    it('si el navegador no sabe consultar el tema del sistema, es claro y no falla', () => {
      const original = window.matchMedia;
      (window as unknown as { matchMedia: unknown }).matchMedia = undefined;
      try {
        expect(create().scheme()).toBe('light');
      } finally {
        window.matchMedia = original;
      }
    });
  });

  it('el color del documento cambia de verdad al elegir un tema, sin importar el del sistema', () => {
    const theme = create();
    const surface = () => {
      const probe = document.createElement('span');
      probe.style.backgroundColor = 'var(--mat-sys-surface)';
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };
    theme.set('light');
    const light = surface();
    theme.set('dark');
    const dark = surface();
    expect(dark).not.toBe(light);
    expect(getComputedStyle(root).colorScheme).toBe('dark');
    theme.set('light');
    expect(getComputedStyle(root).colorScheme).toBe('light');
    theme.set('system');
    expect(getComputedStyle(root).colorScheme).toContain('dark');
    expect(getComputedStyle(root).colorScheme).toContain('light');
  });

  it('si el almacenamiento falla, la elección sigue valiendo mientras dure la pestaña', () => {
    const theme = create();
    const setItem = spyOn(Storage.prototype, 'setItem').and.throwError('almacenamiento bloqueado');
    expect(() => theme.set('dark')).not.toThrow();
    expect(setItem).toHaveBeenCalled();
    expect(theme.preference()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('si no se puede leer el almacenamiento, arranca siguiendo al sistema', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('almacenamiento bloqueado');
    expect(create().preference()).toBe('system');
  });

  it('en el servidor no lee ni escribe el almacenamiento y no falla', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const getItem = spyOn(Storage.prototype, 'getItem').and.callThrough();
    const setItem = spyOn(Storage.prototype, 'setItem').and.callThrough();
    const theme = create('server');
    expect(theme.preference()).toBe('system');
    expect(root.hasAttribute('data-theme')).toBeFalse();
    const choice: ThemePreference = 'light';
    expect(() => theme.set(choice)).not.toThrow();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});

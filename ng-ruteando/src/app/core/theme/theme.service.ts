import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Esquema de color que se ve de verdad: la elección o, si se sigue al sistema, el del sistema. */
export type ColorScheme = 'light' | 'dark';

/** Clave de `localStorage`; la repite `src/assets/theme-init.js`, que aplica la elección antes del primer pintado. */
export const THEME_STORAGE_KEY = 'ruteando-theme';

/**
 * Elección de tema de la persona: seguir al sistema (por defecto), claro u oscuro. Se guarda en este navegador y se aplica con
 * `data-theme` en `<html>`; los estilos globales lo traducen a `color-scheme`, y el tema entero cambia porque todos sus tokens
 * usan `light-dark()`. Seguro en el servidor: allí no hay almacenamiento ni se toca el documento.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly systemDark = signal(false);

  readonly preference = signal<ThemePreference>(this.read());

  /**
   * Esquema efectivo. Lo necesitan los mapas, que dibujan en un canvas y no entienden `light-dark()`: repintan al cambiarlo. En el
   * servidor es siempre claro.
   */
  readonly scheme = computed<ColorScheme>(() => {
    const preference = this.preference();
    return preference === 'system' ? (this.systemDark() ? 'dark' : 'light') : preference;
  });

  constructor() {
    if (this.browser) {
      this.apply(this.preference());
      this.followSystem();
    }
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
    this.apply(preference);
    this.write(preference);
  }

  /** Sigue el tema del sistema en vivo, también con la aplicación abierta. */
  private followSystem(): void {
    const view = this.document.defaultView;
    if (typeof view?.matchMedia !== 'function') {
      return;
    }
    const query = view.matchMedia('(prefers-color-scheme: dark)');
    this.systemDark.set(query.matches);
    const onChange = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
    query.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }

  private apply(preference: ThemePreference): void {
    const root = this.document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
  }

  private read(): ThemePreference {
    try {
      const stored = this.browser ? this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) : null;
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }

  private write(preference: ThemePreference): void {
    if (!this.browser) {
      return;
    }
    try {
      const storage = this.document.defaultView?.localStorage;
      if (preference === 'system') {
        storage?.removeItem(THEME_STORAGE_KEY);
      } else {
        storage?.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch {
      // Sin almacenamiento (modo privado o bloqueado): la elección vale mientras la pestaña siga abierta
    }
  }
}

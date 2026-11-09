import { Injectable, InjectionToken, inject } from '@angular/core';

import { LANGUAGES, Language, language, useLanguage } from './i18n';

/** Recarga la página tras cambiar de idioma; las pruebas lo sustituyen para no recargar el navegador. */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => () => location.reload(),
});

/** ¿Se anima el cambio de idioma? No si la persona pidió menos movimiento. Las pruebas lo apagan para recargar al instante. */
export const SWITCH_ANIMATION = new InjectionToken<boolean>('SWITCH_ANIMATION', {
  providedIn: 'root',
  factory: () => typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches,
});

/** Tiempo para que el selector termine de deslizarse antes de desvanecer la pantalla, y duración del desvanecido. */
export const SLIDE_MS = 320;
export const FADE_MS = 180;

/**
 * Idioma de la interfaz. Se decide al cargar la página; `set` lo guarda y recarga para que todo (textos, fechas y números)
 * salga en el idioma nuevo de una vez. Con movimiento permitido espera a que el selector se deslice y desvanece la pantalla
 * antes de recargar, para que el cambio se sienta fluido y no un salto.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly reload = inject(PAGE_RELOAD);
  private readonly animated = inject(SWITCH_ANIMATION);
  private switching = false;

  readonly languages = LANGUAGES;
  readonly current: Language = language();

  set(lang: Language): void {
    if (lang === this.current || this.switching) {
      return;
    }
    this.switching = true;
    useLanguage(lang);
    if (!this.animated) {
      this.reload();
      return;
    }
    setTimeout(() => {
      const fade =
        typeof document !== 'undefined'
          ? document.body.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, fill: 'forwards' })
          : undefined;
      if (fade) {
        fade.finished.then(
          () => this.reload(),
          () => this.reload()
        );
      } else {
        this.reload();
      }
    }, SLIDE_MS);
  }
}

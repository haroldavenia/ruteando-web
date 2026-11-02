import { Injectable, InjectionToken, inject } from '@angular/core';

import { LANGUAGES, Language, language, useLanguage } from './i18n';

/** Recarga la página tras cambiar de idioma; las pruebas lo sustituyen para no recargar el navegador. */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => () => location.reload(),
});

/**
 * Idioma de la interfaz. Se decide al cargar la página; `set` lo guarda y recarga para que todo (textos, fechas y números)
 * salga en el idioma nuevo de una vez.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly reload = inject(PAGE_RELOAD);

  readonly languages = LANGUAGES;
  readonly current: Language = language();

  set(lang: Language): void {
    if (lang === this.current) {
      return;
    }
    useLanguage(lang);
    this.reload();
  }
}

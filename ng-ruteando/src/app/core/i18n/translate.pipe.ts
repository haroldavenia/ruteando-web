import { Pipe, PipeTransform } from '@angular/core';

import { TranslationParams, t } from './i18n';

/** `{{ 'Guardar' | t }}` y `{{ 'Mostrando {0} de {1}' | t: [shown, total] }}`: traduce un texto fuente al idioma activo. */
@Pipe({ name: 't' })
export class TranslatePipe implements PipeTransform {
  transform(text: string, params?: TranslationParams): string {
    return t(text, params);
  }
}

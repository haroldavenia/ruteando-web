import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

import { I18nProvider } from '@/lib/i18n/client';
import type { Language } from '@/lib/i18n/core';
import { dictionaryOf } from '@/lib/i18n/dictionary';

/** Pinta un componente de cliente con el idioma y el diccionario que le daría el layout (español por defecto: los textos fuente). */
export function renderWithI18n(ui: ReactElement, lang: Language = 'es') {
  return render(
    <I18nProvider lang={lang} dictionary={dictionaryOf(lang)}>
      {ui}
    </I18nProvider>
  );
}

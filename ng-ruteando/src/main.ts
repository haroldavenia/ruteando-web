import { bootstrapApplication } from '@angular/platform-browser';

import { loadDictionary } from './app/core/i18n/i18n';

// El diccionario del idioma se carga ANTES de evaluar el resto de la aplicación: así los textos definidos a nivel de módulo
// (etiquetas, columnas, mensajes) ya salen traducidos. Por eso la aplicación se importa de forma diferida y no al principio.
loadDictionary()
  .then(() => Promise.all([import('./app/app.config'), import('./app/app.component')]))
  .then(([{ appConfig }, { AppComponent }]) => bootstrapApplication(AppComponent, appConfig))
  .catch((err) => console.error(err));

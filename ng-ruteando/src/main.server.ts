import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';

import { loadDictionary } from './app/core/i18n/i18n';

// Igual que en main.ts: el diccionario se carga antes de evaluar la aplicación
const bootstrap = async (context: BootstrapContext) => {
  await loadDictionary();
  const [{ AppComponent }, { config }] = await Promise.all([import('./app/app.component'), import('./app/app.config.server')]);
  return bootstrapApplication(AppComponent, config, context);
};

export default bootstrap;

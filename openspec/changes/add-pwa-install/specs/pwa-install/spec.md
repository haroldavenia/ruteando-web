## ADDED Requirements

### Requirement: Aplicación instalable
La aplicación SHALL poder instalarse como aplicación en escritorio y móvil, con un manifiesto en español, iconos y un service worker, sin cachear nunca los datos del gateway.

#### Scenario: Manifiesto e iconos
- **WHEN** se pide `manifest.webmanifest`
- **THEN** declara `display: standalone`, `lang: es` y los iconos de 192 y 512 píxeles y el maskable, y todos responden 200

#### Scenario: Datos siempre por red
- **WHEN** la aplicación pide algo bajo `/gateway`, `/api` o `/auth`
- **THEN** el service worker no lo sirve desde caché
- **AND** sin conexión la petición falla en lugar de devolver un dato antiguo

#### Scenario: Sin conexión
- **WHEN** no hay conexión con el servidor y se abre la aplicación
- **THEN** se muestra la carcasa de la aplicación desde la caché

### Requirement: Actualización controlada
La aplicación SHALL avisar cuando haya una versión nueva descargada y activarla solo cuando la persona lo pida.

#### Scenario: Versión nueva
- **WHEN** el service worker termina de descargar una versión nueva
- **THEN** se muestra «Hay una versión nueva de Ruteando» con la acción «Recargar»
- **AND** al pulsarla se activa la versión y se recarga la página

#### Scenario: Ficheros del worker sin caché
- **WHEN** se piden `ngsw-worker.js`, `ngsw.json` o `manifest.webmanifest`
- **THEN** la respuesta lleva `Cache-Control: no-cache`

### Requirement: Oferta de instalación
La aplicación SHALL ofrecer «Instalar aplicación» en el menú de usuario cuando el navegador permita instalarla, y una pista en iPhone y iPad, donde no hay aviso.

#### Scenario: Navegador con aviso de instalación
- **WHEN** el navegador lanza `beforeinstallprompt`, aunque sea antes de que cargue el menú
- **THEN** el menú de usuario muestra «Instalar aplicación» y al pulsarlo se abre el cuadro del navegador

#### Scenario: Ya instalada
- **WHEN** la aplicación se instala o ya se ejecuta como aplicación
- **THEN** el menú deja de ofrecer la instalación

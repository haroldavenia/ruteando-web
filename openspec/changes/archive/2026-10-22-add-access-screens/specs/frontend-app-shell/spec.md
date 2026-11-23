# Spec Delta

## MODIFIED Requirements

### Requirement: Arranque en navegador
La aplicación SHALL mostrar la página de inicio con el título de la aplicación en la ruta raíz a quien tenga sesión iniciada, y SHALL llevar a la pantalla de acceso a quien no la tenga.

#### Scenario: Página de inicio
- **WHEN** un usuario con sesión abre `/` con `ng serve`
- **THEN** se renderiza el layout base con la página de inicio y sin errores en consola

#### Scenario: Ruta desconocida
- **WHEN** el usuario abre una ruta que no existe
- **THEN** la aplicación redirige a `/`

#### Scenario: Visitante anónimo en la raíz
- **WHEN** un usuario sin sesión abre `/`
- **THEN** es llevado a la pantalla de acceso y no se muestra la página de inicio ni el layout con menú lateral

### Requirement: Renderizado en servidor
La aplicación SHALL poder servirse con SSR desde el servidor Node generado, sin acceder a APIs exclusivas del navegador durante el render.

#### Scenario: Respuesta SSR
- **WHEN** se ejecuta `npm run serve:ssr:ng-ruteando` tras compilar y se pide `/acceso`
- **THEN** la respuesta HTML contiene el formulario de inicio de sesión ya renderizado

#### Scenario: Raíz sin sesión en el servidor
- **WHEN** se pide `/` al servidor SSR
- **THEN** la respuesta no contiene la página de inicio: es la pantalla de acceso o una redirección a ella

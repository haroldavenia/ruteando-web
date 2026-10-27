# continuous-integration Specification

## Purpose
Garantiza que cada cambio se verifica automáticamente antes de llegar a la rama principal: se ejecutan las pruebas, la compilación, la validación de las specs y la auditoría de dependencias en un entorno reproducible y con permisos mínimos.

## Requirements

### Requirement: Verificación automática de cada cambio
El repositorio SHALL ejecutar la verificación automática en cada pull request, sea cual sea su rama base, y en cada push a `main`.

#### Scenario: Pull request a la rama principal
- **WHEN** se abre o se actualiza un pull request hacia `main`
- **THEN** se ejecuta la verificación y su resultado aparece en el propio pull request

#### Scenario: Pull request apilado
- **WHEN** se abre o se actualiza un pull request cuya base es otra rama de trabajo
- **THEN** se ejecuta igualmente la verificación

#### Scenario: Push a la rama principal
- **WHEN** se fusiona un pull request y `main` recibe los cambios
- **THEN** se ejecuta de nuevo la verificación sobre `main`

#### Scenario: Sin ejecuciones duplicadas ni obsoletas
- **WHEN** se suben varios commits seguidos al mismo pull request
- **THEN** solo termina la ejecución del último y las anteriores se cancelan, y un push a una rama de trabajo con pull request abierto no lanza una segunda ejecución

### Requirement: Comprobaciones que se ejecutan
La verificación SHALL ejecutar las pruebas y la compilación del frontend, las pruebas del servidor, la validación estricta de las specs y la auditoría de dependencias de producción, y SHALL fallar si cualquiera de ellas falla.

#### Scenario: Prueba del frontend que falla
- **WHEN** una prueba del frontend falla
- **THEN** la verificación termina en fallo y el pull request no puede fusionarse

#### Scenario: Compilación rota
- **WHEN** la compilación de producción del frontend falla o emite un error
- **THEN** la verificación termina en fallo

#### Scenario: Prueba del servidor que falla
- **WHEN** una prueba del servidor falla
- **THEN** la verificación termina en fallo

#### Scenario: Spec inválida
- **WHEN** `openspec validate --specs --strict` encuentra una spec inválida
- **THEN** la verificación termina en fallo

#### Scenario: Vulnerabilidad alta o crítica
- **WHEN** las dependencias de producción de la raíz o del frontend tienen una vulnerabilidad alta o crítica
- **THEN** la verificación termina en fallo, y las vulnerabilidades de dependencias de desarrollo no la hacen fallar

#### Scenario: Una sola comprobación obligatoria
- **WHEN** se mira el resultado de la verificación en el pull request
- **THEN** hay una comprobación resumen llamada `ci` que solo está en verde si todas las demás lo están y que falla si alguna fue cancelada

### Requirement: Entorno reproducible
La verificación SHALL usar la versión de Node del repositorio, instalar las dependencias exactas de los `package-lock.json` y no necesitar secretos ni acceso al gateway real.

#### Scenario: Versión de Node
- **WHEN** se ejecuta la verificación
- **THEN** usa la versión de Node de `ng-ruteando/.nvmrc` y `npm` 11

#### Scenario: Dependencias exactas
- **WHEN** se instalan las dependencias de la raíz y del frontend
- **THEN** se hace con `npm ci` y falla si un `package-lock.json` no coincide con su `package.json`

#### Scenario: Sin secretos
- **WHEN** se inspeccionan el flujo de trabajo y los pasos que ejecuta
- **THEN** no usan ningún secreto del repositorio ni piden nada al gateway real, de modo que también funciona en pull requests de ramas externas

#### Scenario: Clon limpio
- **WHEN** se ejecutan los mismos comandos sobre un clon recién hecho del repositorio
- **THEN** pasan sin depender de ficheros que no estén versionados

### Requirement: Permisos mínimos y acciones fijadas
El flujo de trabajo SHALL tener permisos de solo lectura sobre el contenido, SHALL fijar cada acción de terceros por su SHA y SHALL limitar la duración de cada trabajo.

#### Scenario: Permisos
- **WHEN** se inspecciona el flujo de trabajo
- **THEN** declara `permissions: contents: read` y ningún trabajo pide más permisos

#### Scenario: Acciones fijadas
- **WHEN** se inspeccionan las acciones usadas
- **THEN** cada una está fijada por un SHA completo con su versión en un comentario, no por una etiqueta móvil

#### Scenario: Tiempo máximo
- **WHEN** un trabajo se queda colgado
- **THEN** se corta por su tiempo máximo y la verificación falla

### Requirement: Dependencias vigiladas
El repositorio SHALL revisar cada semana las actualizaciones de las dependencias de npm de la raíz y del frontend y de las acciones del flujo de trabajo.

#### Scenario: Actualizaciones semanales
- **WHEN** hay una versión nueva de una dependencia de npm o de una acción
- **THEN** se abre un pull request de actualización, agrupado por tipo cuando proceda y con un máximo de pull requests abiertos, que pasa por la misma verificación

#### Scenario: Dependencias sin uso
- **WHEN** se inspeccionan las dependencias de producción de la raíz y del frontend
- **THEN** ninguna está declarada sin que algún fichero del proyecto la use

### Requirement: Rama principal protegida
La rama `main` SHALL aceptar cambios solo mediante pull request con la comprobación `ci` en verde.

#### Scenario: Cambio sin verificar
- **WHEN** alguien intenta fusionar un pull request cuya comprobación `ci` ha fallado o no se ha ejecutado
- **THEN** GitHub impide la fusión

#### Scenario: Push directo
- **WHEN** alguien intenta subir commits directamente a `main`
- **THEN** GitHub lo rechaza

#### Scenario: Revisión
- **WHEN** un pull request tiene la verificación en verde pero ninguna aprobación
- **THEN** no puede fusionarse hasta que alguien lo apruebe

# Spec Delta

## MODIFIED Requirements

### Requirement: Código fuente versionado
El código de `ng-ruteando/src/app/` SHALL estar sujeto a control de versiones y no ignorado por git.

#### Scenario: Fichero nuevo visible
- **WHEN** se crea `ng-ruteando/src/app/app.config.ts`
- **THEN** `git status` lo muestra como no rastreado y `git check-ignore` no lo ignora

#### Scenario: Regla de la carpeta raíz intacta
- **WHEN** se evalúa la carpeta `app/` de la raíz, salida de compilación de la aplicación AngularJS
- **THEN** sigue ignorada, y `.gitignore` ya no contiene ninguna excepción para `ruteando-ng`

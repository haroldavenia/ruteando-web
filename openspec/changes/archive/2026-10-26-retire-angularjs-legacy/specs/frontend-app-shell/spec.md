# Spec Delta

## ADDED Requirements

### Requirement: Código fuente versionado sin reglas heredadas
El código de `ng-ruteando/src/app/` SHALL estar sujeto a control de versiones sin depender de excepciones en `.gitignore`, que no SHALL contener reglas de la aplicación anterior.

#### Scenario: Fichero nuevo visible
- **WHEN** se crea `ng-ruteando/src/app/app.config.ts`
- **THEN** `git status` lo muestra como no rastreado y `git check-ignore` no lo ignora

#### Scenario: Sin reglas heredadas
- **WHEN** se lee el `.gitignore`
- **THEN** no contiene reglas ni excepciones para una carpeta `app/` en la raíz, para `master/`, para `vendor` ni para `ruteando-ng`

## REMOVED Requirements

### Requirement: Código fuente versionado
**Reason**: Su escenario «Regla existente intacta» exigía mantener ignorada la carpeta `app/` de la raíz, salida de compilación de la aplicación AngularJS que se retira; con ella desaparece también la excepción `!ng-ruteando/src/app/`.
**Migration**: Ver «Código fuente versionado sin reglas heredadas», que conserva el escenario del fichero nuevo visible.

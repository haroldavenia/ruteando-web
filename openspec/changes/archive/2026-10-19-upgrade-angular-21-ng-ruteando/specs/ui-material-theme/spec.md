# Spec Delta

## MODIFIED Requirements

### Requirement: Material como único sistema de UI
La aplicación SHALL usar Angular Material y no depender de Bootstrap ni de ng-bootstrap.

#### Scenario: Dependencias de Bootstrap ausentes
- **WHEN** se inspeccionan `ng-ruteando/package.json` y el `package.json` raíz
- **THEN** no aparecen `bootstrap`, `@popperjs/core` ni `@ng-bootstrap/ng-bootstrap`

#### Scenario: Versiones alineadas
- **WHEN** se comparan las versiones de `@angular/material` y `@angular/cdk` con la de `@angular/core`
- **THEN** coinciden en versión mayor y menor (21.x)

### Requirement: Tema global
La aplicación SHALL aplicar un tema Material 3 global definido una sola vez en los estilos globales.

#### Scenario: Componentes con tema
- **WHEN** se muestra un botón o un campo de formulario de Material
- **THEN** usa los colores primario y de acento del tema y la tipografía Roboto

#### Scenario: Sin tema duplicado
- **WHEN** se inspeccionan los estilos de los componentes
- **THEN** ninguno incluye una segunda definición del tema

#### Scenario: Sin API de tema anterior
- **WHEN** se inspeccionan los estilos globales y los de los componentes
- **THEN** no se usan las funciones del tema Material 2 (`define-light-theme`, `define-palette`) y `ng build` no emite avisos de obsolescencia del tema

#### Scenario: Aspecto del layout conservado
- **WHEN** se compara el shell (barra superior, menú lateral, elemento activo) antes y después del cambio de tema
- **THEN** mantiene la misma estructura y contraste legible (relación de contraste mínima 4.5:1 en texto), aunque los tonos exactos cambien

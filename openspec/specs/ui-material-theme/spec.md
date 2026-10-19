# ui-material-theme Specification

## Purpose
Define el sistema de interfaz del frontend `ng-ruteando`: Angular Material con un tema global, tipografía, iconos y un layout base común para todas las pantallas.

## Requirements

### Requirement: Material como único sistema de UI
La aplicación SHALL usar Angular Material y no depender de Bootstrap ni de ng-bootstrap.

#### Scenario: Dependencias de Bootstrap ausentes
- **WHEN** se inspeccionan `ng-ruteando/package.json` y el `package.json` raíz
- **THEN** no aparecen `bootstrap`, `@popperjs/core` ni `@ng-bootstrap/ng-bootstrap`

#### Scenario: Versiones alineadas
- **WHEN** se comparan las versiones de `@angular/material` y `@angular/cdk` con la de `@angular/core`
- **THEN** coinciden en versión mayor y menor (17.3)

### Requirement: Tema global
La aplicación SHALL aplicar un tema Material global definido una sola vez en los estilos globales.

#### Scenario: Componentes con tema
- **WHEN** se muestra un botón o un campo de formulario de Material
- **THEN** usa los colores primario y de acento del tema y la tipografía Roboto

#### Scenario: Sin tema duplicado
- **WHEN** se inspeccionan los estilos de los componentes
- **THEN** ninguno incluye una segunda definición del tema

### Requirement: Animaciones habilitadas
La aplicación SHALL habilitar las animaciones que requieren los componentes de Material, sin penalizar la carga inicial.

#### Scenario: Diálogo animado
- **WHEN** se abre un componente de Material que anima su entrada
- **THEN** la animación se ejecuta sin errores de proveedor en consola

### Requirement: Layout base
La aplicación SHALL mostrar una barra superior y un menú lateral colapsable que contenga el contenido enrutado.

#### Scenario: Pantalla ancha
- **WHEN** el ancho de la ventana es al menos 960px
- **THEN** el menú lateral se muestra fijo junto al contenido

#### Scenario: Pantalla estrecha
- **WHEN** el ancho de la ventana es menor de 960px
- **THEN** el menú lateral se oculta y se abre con un botón de la barra superior

#### Scenario: Navegación
- **WHEN** el usuario pulsa un elemento del menú lateral
- **THEN** el contenido enrutado cambia y el elemento queda marcado como activo

### Requirement: Iconos y accesibilidad
Los controles interactivos del layout SHALL tener nombre accesible y ser operables con teclado.

#### Scenario: Botón de menú
- **WHEN** un lector de pantalla recorre la barra superior
- **THEN** el botón del menú lateral expone una etiqueta descriptiva en español

#### Scenario: Navegación con teclado
- **WHEN** el usuario recorre el menú con la tecla Tab y activa un elemento con Enter
- **THEN** la navegación se produce igual que con el ratón

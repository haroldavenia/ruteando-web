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

### Requirement: Animaciones habilitadas
La aplicación SHALL habilitar las animaciones que requieren los componentes de Material, sin penalizar la carga inicial.

#### Scenario: Diálogo animado
- **WHEN** se abre un componente de Material que anima su entrada
- **THEN** la animación se ejecuta sin errores de proveedor en consola

### Requirement: Layout base
La aplicación SHALL mostrar, en el área autenticada, una barra superior y un menú lateral colapsable que contenga el contenido enrutado.

#### Scenario: Pantalla ancha
- **WHEN** el ancho de la ventana es al menos 960px
- **THEN** el menú lateral se muestra fijo junto al contenido

#### Scenario: Pantalla estrecha
- **WHEN** el ancho de la ventana es menor de 960px
- **THEN** el menú lateral se oculta y se abre con un botón de la barra superior

#### Scenario: Navegación
- **WHEN** el usuario pulsa un elemento del menú lateral
- **THEN** el contenido enrutado cambia y el elemento queda marcado como activo

#### Scenario: Pantallas sin sesión
- **WHEN** se muestra una pantalla de acceso
- **THEN** no se muestran la barra superior ni el menú lateral del área autenticada

### Requirement: Iconos y accesibilidad
Los controles interactivos del layout SHALL tener nombre accesible y ser operables con teclado.

#### Scenario: Botón de menú
- **WHEN** un lector de pantalla recorre la barra superior
- **THEN** el botón del menú lateral expone una etiqueta descriptiva en español

#### Scenario: Navegación con teclado
- **WHEN** el usuario recorre el menú con la tecla Tab y activa un elemento con Enter
- **THEN** la navegación se produce igual que con el ratón

### Requirement: Menú de usuario y cierre de sesión confirmado
El layout del área autenticada SHALL mostrar la persona con sesión iniciada y permitirle cerrar la sesión tras una confirmación.

#### Scenario: Datos de la persona
- **WHEN** hay una sesión iniciada
- **THEN** la barra superior ofrece un menú de usuario que muestra su nombre y su correo

#### Scenario: Cerrar sesión confirmando
- **WHEN** el usuario elige "Cerrar sesión" y confirma en el diálogo
- **THEN** la sesión se cierra y el usuario llega a la pantalla de acceso

#### Scenario: Cancelar el cierre
- **WHEN** el usuario elige "Cerrar sesión" y cancela el diálogo, o lo cierra con la tecla Escape
- **THEN** la sesión sigue iniciada y el foco vuelve al menú de usuario

#### Scenario: Accesibilidad del menú
- **WHEN** el usuario recorre el menú con el teclado
- **THEN** el botón del menú tiene una etiqueta en español, se abre con Intro y las opciones se activan con Intro

### Requirement: Menú por secciones y rol
El menú lateral SHALL agrupar las entradas por secciones de negocio y SHALL mostrar a cada persona solo las entradas de las rutas a las que su rol da acceso.

#### Scenario: Administrador
- **WHEN** un usuario `tenant_admin` o `super_admin` abre el área autenticada
- **THEN** el menú muestra "Inicio", la sección "Flota" con "Vehículos", "Tipos de vehículo" y "Conductores", y las entradas "Lugares" y "Paquetes"

#### Scenario: Otros roles
- **WHEN** un usuario `agent` o `driver` abre el área autenticada
- **THEN** el menú muestra "Inicio", no muestra la sección "Flota" ni la entrada "Lugares", y muestra "Paquetes" solo al agente

#### Scenario: Elemento activo en una sección
- **WHEN** la ruta actual es una pantalla de la sección o una de sus subrutas (por ejemplo la edición de un vehículo, de un lugar o de un paquete)
- **THEN** la entrada correspondiente del menú se marca como activa

#### Scenario: Sin sesión cargada
- **WHEN** el usuario aún no está disponible durante el render en servidor
- **THEN** el menú muestra solo las entradas visibles para cualquier rol y no falla

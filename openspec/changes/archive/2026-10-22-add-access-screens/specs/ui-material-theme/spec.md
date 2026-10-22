# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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

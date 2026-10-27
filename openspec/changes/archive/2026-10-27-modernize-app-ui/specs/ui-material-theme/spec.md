# Spec Delta

## MODIFIED Requirements

### Requirement: Tema global
La aplicación SHALL aplicar un tema Material 3 global, claro u oscuro según la preferencia del sistema, definido una sola vez en los estilos globales.

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

#### Scenario: Tema oscuro
- **WHEN** el sistema tiene el tema oscuro activado
- **THEN** los componentes de Material, el shell y los diálogos usan los tonos oscuros del tema

### Requirement: Layout base
La aplicación SHALL mostrar, en el área autenticada, una barra superior con la marca y un menú lateral colapsable con encabezado y secciones rotuladas, que contengan el contenido enrutado en un área centrada con ancho máximo.

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

#### Scenario: Marca y persona
- **WHEN** se muestra el área autenticada
- **THEN** la barra superior muestra la marca de la aplicación y un avatar con las iniciales de la persona que abre su menú de usuario

#### Scenario: Elemento activo visible
- **WHEN** una entrada del menú corresponde a la ruta actual
- **THEN** se marca como activa con un fondo propio y con el atributo de página actual, no solo con el peso de la letra

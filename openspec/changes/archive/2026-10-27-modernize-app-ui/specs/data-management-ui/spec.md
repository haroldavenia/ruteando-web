# Spec Delta

## ADDED Requirements

### Requirement: Presentación de listados y formularios
Los listados y formularios de datos SHALL presentarse en superficies del sistema de interfaz común: la tabla con su filtro y su paginador en una tarjeta, y el formulario por secciones en una tarjeta, sin cambiar su comportamiento.

#### Scenario: Listado en tarjeta
- **WHEN** se abre un listado de datos
- **THEN** el filtro, la tabla y el paginador están dentro de una misma tarjeta bajo la cabecera de la pantalla

#### Scenario: Estado como etiqueta
- **WHEN** una columna muestra un estado
- **THEN** se presenta con la etiqueta de estado con icono y texto

#### Scenario: Formulario en secciones
- **WHEN** se abre un formulario de alta o edición
- **THEN** los campos se agrupan en una tarjeta con títulos de sección y, en pantallas anchas, en dos columnas, y las acciones quedan al final

#### Scenario: Formulario en pantalla estrecha
- **WHEN** la ventana es estrecha
- **THEN** los campos se muestran en una columna y las acciones siguen siendo alcanzables

#### Scenario: Comportamiento intacto
- **WHEN** se filtra, pagina, valida, envía, cancela o borra
- **THEN** la validación, los mensajes, el foco al primer campo con error, la confirmación al salir con cambios y la del borrado se comportan igual que antes

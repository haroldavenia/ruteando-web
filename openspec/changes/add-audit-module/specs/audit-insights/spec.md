## Purpose

Resume de un vistazo qué pasó en un ámbito de auditoría: cuántos eventos hubo, quién estuvo activo, qué se tocó más y cómo se reparte la actividad por día y por tipo de acción, siempre sobre los eventos que dejan los filtros.

## ADDED Requirements

### Requirement: Cifras de actividad
La pantalla de auditoría SHALL mostrar encima del listado cuatro cifras calculadas sobre los eventos que dejan la búsqueda y los filtros: número de eventos, personas activas, entidad más tocada y último evento.

#### Scenario: Con eventos
- **WHEN** el listado tiene eventos
- **THEN** se muestran el número de eventos, el número de correos distintos que actuaron, el tipo de entidad con más eventos junto a su recuento («Vehículo · 5») y el último evento como «hace 3 h»

#### Scenario: Personas sin correo
- **WHEN** hay eventos sin correo del autor
- **THEN** no se cuentan como personas activas y no cambian el recuento de personas

#### Scenario: Seguimiento de los filtros
- **WHEN** la persona cambia un filtro
- **THEN** las cuatro cifras se recalculan sobre los eventos que quedan

#### Scenario: Mi actividad
- **WHEN** el ámbito es «Mi actividad»
- **THEN** no se muestra «Personas activas», porque sería siempre la misma persona, y quedan las otras tres cifras

#### Scenario: Sin eventos
- **WHEN** no queda ningún evento
- **THEN** las cifras muestran «0» y «—» donde no aplica, sin errores

### Requirement: Actividad por día
La pantalla SHALL mostrar un gráfico de barras con el número de eventos de cada día, contado en la hora local, que cubra el rango filtrado —«Todo» y un rango personalizado sin inicio cubren desde el día del evento más antiguo hasta hoy— y SHALL permitir filtrar el listado a un día al elegir su barra.

#### Scenario: Una barra por día
- **WHEN** el rango son 7 días
- **THEN** el gráfico tiene siete barras, incluidos los días sin eventos con altura cero, y la barra de hoy se identifica como parcial

#### Scenario: Elegir un día
- **WHEN** la persona elige la barra de un día
- **THEN** el rango pasa a ser ese día, el listado y el resto del panel se actualizan y vuelve a poder elegir otro rango

#### Scenario: Veinticuatro horas
- **WHEN** el rango es «24 horas»
- **THEN** el gráfico tiene dos barras, ayer y hoy

#### Scenario: Número sobre la barra
- **WHEN** el gráfico tiene catorce barras o menos
- **THEN** cada barra con eventos lleva su cantidad encima, y con más barras la cantidad queda en su título

#### Scenario: Valores exactos
- **WHEN** la persona enfoca o pasa el cursor por una barra
- **THEN** se muestra su fecha y número de eventos, y la barra también es operable con teclado

#### Scenario: Rango largo
- **WHEN** el rango cubre más de 31 días
- **THEN** las barras agrupan por semana (lunes a domingo), se pintan como máximo las últimas 26 y el título del gráfico dice «por semana»

### Requirement: Reparto por tipo de acción
La pantalla SHALL mostrar cómo se reparten los eventos filtrados entre los seis tipos de acción, con el recuento y el porcentaje de cada uno, y SHALL permitir filtrar por un tipo al elegirlo.

#### Scenario: Reparto
- **WHEN** hay eventos de varios tipos
- **THEN** una barra apilada y una leyenda muestran cada tipo con su recuento y su porcentaje, y los tipos sin eventos no aparecen

#### Scenario: Elegir un tipo
- **WHEN** la persona elige un tipo en la leyenda
- **THEN** el filtro de tipo de acción pasa a ser ese y el listado se actualiza

### Requirement: Alternativa accesible del panel
Cada gráfico del panel SHALL tener una alternativa en tabla con los mismos datos y un resumen en texto, SHALL no depender solo del color para distinguir sus partes y SHALL conservar el contraste en tema claro y oscuro.

#### Scenario: Lector de pantalla
- **WHEN** un lector de pantalla llega al gráfico de actividad
- **THEN** encuentra un resumen en texto («47 eventos en 7 días; el día con más actividad fue el 11 de octubre, con 20») y una tabla con la fecha y el número de eventos de cada día

#### Scenario: Sin color
- **WHEN** los tipos de acción se distinguen en la barra apilada
- **THEN** cada segmento lleva además su nombre o su glifo en la leyenda, no solo un color

#### Scenario: Pantalla estrecha
- **WHEN** la pantalla mide 320 px de ancho
- **THEN** el gráfico se adapta al ancho disponible sin desplazamiento horizontal y cada día o semana sigue pudiéndose elegir desde la tabla de datos, con botones de 44 px

### Requirement: Panel plegable
La persona SHALL poder ocultar el panel de actividad para dar más espacio al listado, y la pantalla SHALL recordar esa elección en el navegador.

#### Scenario: Ocultar
- **WHEN** la persona pulsa «Ocultar resumen»
- **THEN** el panel se pliega, el botón pasa a «Mostrar resumen» y la elección se recuerda al volver

#### Scenario: Sin almacenamiento
- **WHEN** el navegador no permite guardar la preferencia
- **THEN** la pantalla funciona igual y el panel se muestra desplegado

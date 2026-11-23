# Spec Delta

## ADDED Requirements

### Requirement: Formulario de configuración por secciones
El formulario de configuración SHALL agrupar sus campos en secciones con icono y título (Ruta, Lugares, Flota, Qué evalúa la planificación y Estancia en cada parada) y SHALL presentar lo que evalúa la planificación como interruptores, sin cambiar los campos, sus condiciones ni lo que se envía.

#### Scenario: Secciones
- **WHEN** se abre el formulario de una configuración nueva o existente
- **THEN** los campos están en las cinco secciones, cada una con su icono y su título

#### Scenario: Interruptores
- **WHEN** se ve «Qué evalúa la planificación»
- **THEN** «Evaluar peso», «Evaluar volumen» y «Evaluar zona del itinerario» son tres interruptores con los mismos nombres de antes, y activar o desactivar uno cambia el mismo valor que cambiaban las casillas

#### Scenario: Campos condicionales intactos
- **WHEN** se elige un tipo de restricción o un tipo de estancia
- **THEN** el número de rutas, el turno y el valor de la estancia aparecen y se validan exactamente como antes

### Requirement: Resumen de la configuración en lenguaje natural
El formulario SHALL mostrar junto a los campos una frase «Así quedará» que describe la configuración que se está escribiendo, y esa frase SHALL ser solo un formato de los valores del formulario: no se envía, no calcula nada y no inventa lo que falta.

#### Scenario: Frase completa
- **WHEN** hay 3 rutas fijas de ida y vuelta, una salida llamada «Depósito central», 3 vehículos y se evalúan el peso y el volumen
- **THEN** la frase es «Planificará 3 rutas (ida y vuelta) desde Depósito central, con 3 vehículos, evaluando peso y volumen.»

#### Scenario: Se actualiza al editar
- **WHEN** cambia el tipo de restricción, el número de rutas, los lugares, los vehículos o lo que se evalúa
- **THEN** la frase cambia sin guardar nada

#### Scenario: Lo que falta no se dice
- **WHEN** todavía no se ha elegido un lugar de salida, ni vehículos, ni qué evaluar
- **THEN** la frase solo dice lo que hay («Planificará rutas.») y no menciona lo que falta

#### Scenario: Posición según el ancho
- **WHEN** la ventana mide 1100px o más
- **THEN** el resumen queda a la derecha de los campos y acompaña al desplazar; por debajo, va después del formulario

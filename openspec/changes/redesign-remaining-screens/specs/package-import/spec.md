# Spec Delta

## ADDED Requirements

### Requirement: Pasos de la importación visibles
La pantalla de importación SHALL mostrar los cuatro pasos (Prepara el archivo, Elige el archivo, Revisa y confirma, Importa) indicando cuáles están hechos y cuál es el actual, sin cambiar la lectura, la validación ni la creación de paquetes.

#### Scenario: Al empezar
- **WHEN** se abre `/paquetes/importar`
- **THEN** «Prepara el archivo» aparece hecho, «Elige el archivo» como el paso actual y los demás pendientes

#### Scenario: Tras leer el archivo
- **WHEN** el archivo se ha leído y se muestra la vista previa
- **THEN** «Revisa y confirma» es el paso actual y los dos anteriores están hechos

#### Scenario: Durante y después de importar
- **WHEN** la importación está en marcha
- **THEN** «Importa» es el paso actual; al terminar, los cuatro pasos aparecen hechos

#### Scenario: Accesible
- **WHEN** un lector de pantalla recorre los pasos
- **THEN** los pasos son una lista con nombre y el actual se anuncia como paso actual; los círculos con el número o la marca son decorativos

### Requirement: Selector de archivo y resultado con el aspecto del sistema
El botón del selector de archivo SHALL medir al menos 44px de alto con las esquinas del sistema y el resultado de la importación SHALL mostrar cada cifra (creados, ya existían, fallidos y sin procesar) en su tarjeta.

#### Scenario: Selector de archivo
- **WHEN** se ve el selector de archivo
- **THEN** su botón mide al menos 44px de alto y tiene esquinas de 12px

#### Scenario: Cifras del resultado
- **WHEN** termina la importación
- **THEN** se ve una tarjeta con su nombre y su cifra para cada uno de los cuatro recuentos

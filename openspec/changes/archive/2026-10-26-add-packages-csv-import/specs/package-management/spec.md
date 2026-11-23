# Spec Delta

## ADDED Requirements

### Requirement: Acceso a la importación desde el listado
El listado de paquetes SHALL ofrecer la acción de importar paquetes desde un CSV.

#### Scenario: Botón de importación
- **WHEN** el usuario abre `/paquetes`
- **THEN** ve el botón «Importar CSV» junto a «Exportar CSV» y «Nuevo paquete», que lleva a `/paquetes/importar`

#### Scenario: Lista vacía
- **WHEN** el tenant no tiene paquetes
- **THEN** la pantalla de lista vacía ofrece también importar un CSV

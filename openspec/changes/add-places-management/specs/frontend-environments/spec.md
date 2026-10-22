# Spec Delta

## ADDED Requirements

### Requirement: Configuración del mapa por entorno
Los ficheros de entorno SHALL definir la configuración del mapa (URL de teselas, atribución, centro y zoom por defecto) sin incluir claves ni secretos.

#### Scenario: Valores presentes
- **WHEN** se compila con la configuración de desarrollo o de producción
- **THEN** el entorno expone la URL de teselas, el texto de atribución, el centro como latitud y longitud y el zoom

#### Scenario: Sin claves en el cliente
- **WHEN** se buscan en `ng-ruteando/src` claves de proveedores de mapas
- **THEN** no aparece ninguna

#### Scenario: Sin URLs fijas en el código
- **WHEN** se busca `https?://` en `ng-ruteando/src/app` excluyendo ficheros de prueba
- **THEN** la URL de teselas no aparece en el código de la aplicación, solo en los ficheros de entorno

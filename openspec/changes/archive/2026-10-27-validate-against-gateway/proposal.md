# Proposal

## Why

Las pantallas de jornadas, rutas y visitas se escribieron sin ver una respuesta real del gateway: sus «fixtures reales» salen de los ejemplos de una colección Postman, no de capturas en vivo, y `POST /journeys/plan` falla con ids reales (defecto conocido del backend), así que quizá nunca hubo una jornada real con rutas. La premisa del seguimiento de visitas (una visita es una parada con `packageId`) está en duda: en el único ejemplo de planificación las paradas de servicio traen `packageId: null`. Además, las tres últimas verificaciones manuales (4.3 de visitas, 1.1 y 1.2 de la retirada del legacy) se archivaron sin hacerse, y la sección «Últimas jornadas» de la home sigue prometida en su spec y sin implementar porque depende del orden de `GET /journeys`. Antes de añadir más funcionalidad toca comprobar lo ya construido contra el gateway real.

## What Changes

- **Verificación contra el gateway real**, con un protocolo explícito: lecturas con un usuario de prueba y, para las escrituras, un tenant desechable creado con `POST /auth/register`, sin tocar datos reales. Se comprueba: login y renovación, `GET /journeys` (orden, `sort`, paginación), si una jornada con rutas existe o puede crearse (¿sigue fallando `journeys/plan` con ids hexadecimales?), si las paradas traen `packageId`, el cambio de estado de un paquete y el tiempo y las unidades de una planificación.
- **Registro de resultados** en `gateway-api.md` (sección «Verificado contra el gateway real», con fecha y qué sigue sin verificar), corrigiendo lo que resulte falso. Los fixtures solo se tocan donde la forma real difiera, saneados.
- **«Últimas jornadas» en la home**, ya especificada, con el orden y la paginación que confirme la verificación.
- **Decisión sobre las visitas**: si `packageId` no viene, no se arregla en este change; se documenta la evidencia y se abre otro change (`fix-route-visits-source`) con el origen alternativo que se haya observado.
- **Deuda**: versionar `CLAUDE.md` y `.claude/` (retirando de la skill `migracion-ruteando` lo que ya no aplica), y sustituir `SECURITY.md`, hoy una plantilla de GitHub con versiones inventadas, por una política real mínima.
- Fuera de alcance: arreglar el defecto de `journeys/plan` (es del backend), servicios asignados, exportar a PDF y cualquier pantalla nueva.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities
- `home-dashboard`: las jornadas de la home se muestran de más reciente a más antigua según su fecha de creación, con independencia del orden por defecto del gateway.

## Impact

- `ng-ruteando/src/app/home/` (sección de últimas jornadas), `core/api/api-config.ts` y `journeys.api.ts` solo si el gateway acepta `sort`, y sus pruebas.
- `.claude/skills/angular-ruteando/references/gateway-api.md`, `.claude/skills/migracion-ruteando/`, `CLAUDE.md`, `SECURITY.md`, y posiblemente `ng-ruteando/src/testing/fixtures/gateway/*`.
- Efecto externo: la verificación crea un tenant, un usuario y datos de prueba en el gateway real; requiere autorización expresa antes de cada escritura y que el gateway esté disponible (hoy responde 403 en la raíz y antes respondió 530).
- Ningún secreto se versiona: credenciales de prueba solo en el entorno o en `.env`.

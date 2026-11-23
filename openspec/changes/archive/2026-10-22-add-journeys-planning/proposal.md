# Proposal

## Why

Con flota, lugares, paquetes y configuraciones ya migrados, existe todo lo que `POST /journeys/plan` necesita, pero la aplicación nueva todavía no puede producir ni consultar una jornada, que es el resultado de negocio de toda la herramienta. `JourneysApi` (listar, planificar, detalle, borrar, métricas), el modelo `Journey` y su conversión a dominio (`PlannedJourney` con rutas ya decodificadas) y los fixtures reales ya están hechos. Falta la pantalla: elegir una configuración y los paquetes, planificar, ver el resumen y las rutas resultantes y poder borrar. El dibujo de las rutas sobre el mapa se deja para el change siguiente.

## What Changes

- Pantalla **Jornadas** (`/jornadas`): listado paginado con nombre, estado, configuración, servicios, vehículos y fecha; detalle y borrado.
- Pantalla **Planificar jornada** (`/jornadas/nueva`): nombre, **configuración** (de `SettingsApi`) y **paquetes** a incluir, elegidos en una tabla paginada con selección que se conserva entre páginas, filtro y atajo «Seleccionar todos los pendientes». Al planificar se muestra el progreso (la optimización puede tardar) y, al terminar, se lleva al detalle.
- Pantalla **Detalle de jornada** (`/jornadas/:id`): resumen (estado, configuración, totales, tiempos mínimo, medio y máximo), tabla de **rutas** (nombre, vehículo, paradas, distancia, duración, uso de peso y de volumen, inicio y fin), **paradas** de cada ruta y lista de paquetes no planificables con enlace a su ficha.
- **Errores de planificación** claros: se muestra el mensaje del gateway (incluido el 400 conocido con ids hexadecimales), el tiempo de espera agotado (504) y la configuración o los paquetes inválidos, y se puede reintentar sin perder la selección.
- Entrada **«Jornadas»** en el menú para `tenant_admin`, `super_admin` y `agent`.
- Etiquetas en español de `JourneyStatus` (incluidos `planned` y `completed`, que el gateway también devuelve) y de `StopType`.
- Fuera de alcance: dibujar las rutas en el mapa, navegación giro a giro, métricas y gráficas, despachar o cancelar jornadas, importar paquetes desde CSV, compartir y exportar.

## Capabilities

### New Capabilities
- `journey-planning`: planificar jornadas a partir de una configuración y de paquetes elegidos, listar jornadas, consultar su detalle (resumen, rutas, paradas y paquetes no planificables) y borrarlas.

### Modified Capabilities
- `ui-material-theme`: el menú lateral incluye la entrada "Jornadas" para administradores y agentes.

## Impact

- Código nuevo: `ng-ruteando/src/app/features/journeys/**`.
- Modificado: `app.routes.ts`, `layout/shell.component.*` (menú), `core/api` solo si una prueba contra los fixtures reales revela un modelo incorrecto, y pruebas.
- Dependencias: ninguna nueva.
- Requiere: `add-settings-management` archivado (ya lo está).
- Riesgos: **`POST /journeys/plan` falla en el gateway real con ids hexadecimales** (400 `For input string`, defecto del backend); sin arreglo, la planificación real no es utilizable y esta fase solo se podrá verificar con fixtures; la optimización puede superar el tiempo de espera del proxy (`GATEWAY_TIMEOUT_MS`, 30 s por defecto), por lo que hay que documentar cómo subirlo y mostrar el 504; el gateway puede devolver estados que no están en el dominio documentado (`planned`, `completed`); `routes` es `null` en los listados y solo viene en el detalle; elegir muchos paquetes exige pedir todas las páginas (una petición por cada 200 paquetes); el rol que puede planificar no está documentado (se parte de administradores y agentes).
- Sin impacto en `server/` ni en `master/`.

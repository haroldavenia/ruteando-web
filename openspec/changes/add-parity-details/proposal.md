# Proposal

## Why

Últimos detalles de paridad con la app AngularJS: el asistente «Cómo crear el archivo de direcciones» (5 pasos) y el mapa de servicios asignados.

## What Changes

- `/packages/import`: desplegable «Cómo crear el archivo, paso a paso» (descargar la plantilla, abrirla, escribir una fila por paquete, guardarla como CSV y elegirla aquí).
- `/assigned-services/map` (botón «Ver en el mapa» del listado): las rutas de los servicios asignados juntas en `RoutesMapComponent`, renumeradas y nombradas «jornada · ruta»; avisa de los servicios que no se pudieron dibujar.

## Fuera de alcance

El mapa de posiciones de los conductores (`positions` y `driver/*`): ya está planeado en `enhance-fleet-experience` (lote B) y la app vieja tampoco lo tenía.

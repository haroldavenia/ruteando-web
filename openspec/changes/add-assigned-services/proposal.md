# Proposal

## Why

La app AngularJS asignaba una ruta a un vehículo y un conductor (módulo «Servicios asignados»); la nueva solo tenía el cliente HTTP sin pantallas.

## What Changes

- `/assigned-services` (administradores y agentes; entrada «Servicios asignados» en el menú): listado con búsqueda, selección, borrado en lote y exportación a CSV; los ids se muestran como nombres (jornada · ruta, vehículo, conductor).
- Formulario `/assigned-services/new` y `/:id`: jornada, ruta, vehículo, conductor y fecha. La ruta propone su vehículo y este su conductor; `?journey=ID&route=N` precarga. El estado no se expone: se reenvía el que ya tenía (`ACTIVO` al crear).
- Detalle de ruta: tarjeta «Servicio asignado» (asignar, cambiar o quitar).
- Contrato aislado en `core/api/data/assigned-services-contract.ts`: `route: { journeyId, routeIndex }`, `vehicle: { id }`, `driver: { id }`; las rutas del gateway no tienen id propio.

## Fuera de alcance

Vista de mapa por servicio y de visitas por servicio (la app vieja tenía los botones sin implementar).

## Sin verificar

Los objetos anidados de `/assigned-services` son una hipótesis (la colección Postman los trae en `null`); solo se probó con el gateway simulado. Los nombres se resuelven con las primeras 100 jornadas y vehículos.

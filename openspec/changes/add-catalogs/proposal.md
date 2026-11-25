# Proposal

## Why

La app AngularJS tenía un CRUD de catálogos (nombre, padre y ancestros). La nueva solo leía `master-domains` para llenar selectores, aunque el API tiene `addValue` y `toggleValue`.

## What Changes

- `/catalogs` (administradores; entrada «Catálogos» en el menú): listado de catálogos (código, descripción, tipo, valores activos) y detalle `/catalogs/:code` con sus valores.
- Detalle: alta de un valor (clave sin espacios, nombre, descripción y orden opcionales) y activar o desactivar un valor; desactivar pide confirmación porque los selectores dejan de ofrecerlo. La clave repetida (409) y los errores del gateway se muestran.
- `MasterDomainsService.refresh()`: tras cada cambio actualiza la lectura que llena los selectores.
- Gateway simulado: `GET /master-domains/:code` y `/values`, alta de valor (400 y 409) y alternar.

## Decisión

El gateway no tiene jerarquía: los catálogos son dominios planos con valores. No se porta el padre ni los ancestros de la app vieja. Tampoco hay borrar valores ni crear catálogos (el Postman no los trae).

## Sin verificar

Si el gateway real deja añadir valores a los catálogos del sistema (los 13 que hay lo son); el simulado sí.

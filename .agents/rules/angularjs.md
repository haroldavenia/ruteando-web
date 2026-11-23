---
trigger: glob
globs: master/js/**, master/jade/**, master/less/**, app/i18n/**
---

# AngularJS 1.3.15 en este repo
- Módulo global `App` (`master/js/app.init.js`, nombre `angle`). Registra con `App.controller|factory|directive` y **anotación de array** (Gulp minifica).
- Estados ui-router en `master/js/modules/config.js` con `data: { roles: [...] }`; parámetros entre pantallas con `params`/`returnTo` (patrón existente).
- Vistas Jade en `master/jade/views/pages/<modulo>/`; `app/` es salida de Gulp (no se edita a mano, salvo `app/i18n/*.json` mientras FND-002 no los mueva).
- Datos: servicios `master/js/modules/services/<entidad>.api.js` sobre `ApiClient` (FND-002) con `toDomain`/`toRequest` exportados. Prohibido `$http`/`$resource` con URL literal en controladores y `config().path.api.*`.
- UI: componentes `rw-*` y patrones de `docs/ui/sistema-ui.md`; cada pantalla igual a su maqueta `docs/ui/maquetas/index.html#<id>`. Estados cargando/vacío/error/éxito siempre.
- Coordenadas `{lat,lng}` en dominio (`GeoUtils`); unidades de la API g/cm³/cm/m/s convertidas con `Units` (FND-003).
- i18n: `$translate.instant('modulo.clave')` con claves en `es`, `en` y `es_AR`.
- Compila con `cd master && npx gulp build` (o el script que fije FND-001) antes de los E2E.

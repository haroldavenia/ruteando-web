# Tasks

## 1. Preparación y disponibilidad

- [x] 1.1 Arrancar `npm start` y pedir sin sesión `GET /gateway/journeys`; verificar que responde 401 (el gateway está disponible) y anotar el código obtenido. Si responde 403, 5xx o no responde, parar y avisar: no se sigue sin gateway
- [x] 1.2 Pedir a quien revisa un usuario de prueba y su autorización expresa para crear un tenant desechable con `POST /auth/register`; verificar que ambas cosas constan en la conversación antes de pasar a los grupos 2 y 3 (sin credenciales solo se hace la parte pública)

## 2. Verificación de lecturas

- [x] 2.1 Iniciar sesión por el proxy local, leer `GET /auth/me` y renovar con `POST /auth/refresh`; verificar que se anota si el rol, el tenant y la caducidad coinciden con el modelo de `core/auth`, sin tokens ni correos en las notas
- [ ] 2.2 Con `GET /journeys`: orden por defecto (comparando `createdAt` de la primera y la última página), `totalElements` y `totalPages`, y si `sort=createdAt,desc` cambia el orden; verificar que la conclusión («orden por defecto: …; `sort`: acepta/ignora») queda anotada para decidir la estrategia de 4.1
- [x] 2.3 Si el tenant tiene jornadas con rutas, abrir una con `GET /journeys/{id}` y comprobar si las paradas de servicio traen `packageId`, qué trae `packageInfo`, y las unidades de distancia y duración; verificar que el resultado se anota, o que consta que no hay jornadas con rutas para comprobarlo

## 3. Verificación con escrituras en un tenant desechable

- [x] 3.1 Registrar el tenant desechable y crear un depósito, un tipo de vehículo, un vehículo, una configuración y tres paquetes con ids reales (hexadecimales); verificar que cada creación se anunció antes y que las respuestas coinciden con los modelos (`Place`, `ResourceType`, `Resource`, `Settings`, `Package`), anotando las diferencias
- [x] 3.2 Planificar con `POST /journeys/plan` y esos paquetes; verificar que se anota si sigue fallando con 400 `For input string`, el tiempo que tarda y, si funciona, si las paradas traen `packageId` y las unidades reales
- [x] 3.3 Cambiar el estado de un paquete con `PATCH /packages/{id}/status/{status}`, comprobar con `GET /packages/{id}` y, si hay una jornada con rutas, abrir en el navegador `/jornadas/:id/rutas/0`, cambiar un estado y ver que el avance se recalcula; verificar que el resultado queda anotado
- [x] 3.4 Escribir en `gateway-api.md` la sección «Verificado contra el gateway real» con fecha, lo comprobado, lo que sigue sin comprobar y la decisión sobre las visitas según el árbol del diseño, y corregir las afirmaciones que resulten falsas; editar a mano, saneados, los fixtures cuya forma real difiera; verificar con `grep` que no hay tokens, correos reales ni ids de producción en lo versionado y que `npm run test:ci` en `ng-ruteando/` sigue pasando

## 4. Últimas jornadas en la home

- [x] 4.1 Crear `latestJourneys` (pura, ordena por `createdAt` descendente de forma estable con las jornadas sin fecha al final y se queda con cinco) y la petición según la estrategia confirmada en 2.2, añadiendo `sort` a `PageParams` solo si el gateway lo acepta; verificar con el spec de la función (más de cinco, pocas, fechas iguales, fecha ausente) y con el de `JourneysApi` si cambia la petición
- [x] 4.2 Añadir la sección «Últimas jornadas» a `HomeComponent` (nombre, estado en español, fecha local y enlace al detalle, «Ver todas las jornadas», carga, vacío con enlace a planificar, error con «Reintentar», sin petición para roles sin acceso a `/jornadas` ni en el servidor); verificar con `home.component.spec.ts` (cada escenario de la spec, que los accesos aparecen mientras carga, que `driver` no pide nada) y con `app.routes.spec.ts` sin peticiones sueltas
- [x] 4.3 Documentar el orden y la estrategia usados en `gateway-api.md` y en `CLAUDE.md`; verificar que lo escrito coincide con el código (`grep` del nombre de la función y del parámetro)

## 5. Deuda de documentación y seguridad

- [x] 5.1 Reemplazar `SECURITY.md` por una política mínima real (versión soportada, vía de aviso privada, plazo orientativo) preguntando antes a quien mantiene el repositorio por el contacto; verificar que no queda ninguna tabla de versiones inventada y que el contacto es el indicado
- [x] 5.2 Borrar la skill `.claude/skills/migracion-ruteando`, añadir `.claude/settings.local.json` al `.gitignore` y versionar `CLAUDE.md` y `.claude/`; verificar con `git ls-files CLAUDE.md .claude` que están, con `grep -rIn "migracion-ruteando" CLAUDE.md .claude` que no queda ninguna referencia, y con `grep -rIni "password\|token\|secret" .claude CLAUDE.md` que no hay valores reales
- [x] 5.3 Comprobación final: `npm run test:ci` en `ng-ruteando/`, `npm run test:server`, `npm run build:web` y `openspec validate --specs --strict`; verificar que pasan sin avisos nuevos

## Workflow follow-up

- Si la verificación refuta la premisa de las visitas, abrir `fix-route-visits-source` con la evidencia anotada en `gateway-api.md`.
- Archivar el change con `/opsx:archive` tras la revisión.

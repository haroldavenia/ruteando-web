# Design

## Context

Ver proposal.md (Why). Estado observado:

- Los fixtures de `ng-ruteando/src/testing/fixtures/gateway/` salen de `scripts/extract-gateway-fixtures.mjs`, que lee los ejemplos 2xx de una colección Postman: son ejemplos, no capturas del gateway real. En el de `POST /journeys/plan` las paradas `service` traen `packageId: null`, `packageInfo: null` y `placeId: null`.
- `gateway-api.md` ya recoge hallazgos en vivo del 2026-10-19: `Origin` rompe el login (403), formato de error, `guideNumber` único por tenant, `POST /journeys/plan` falla con ids hexadecimales (400 `For input string`), un solo refresco ante varios 401, y que `POST /auth/register` crea tenant y usuario y permite iniciar sesión sin verificar el correo.
- Marcadas como «sin verificar» y archivadas así: 4.3 de `add-routes-visits-tracking`, 1.1 y 1.2 de `retire-angularjs-legacy` y las pruebas manuales de varios changes anteriores (plan, mapa de rutas, CSV, zonas).
- `JourneysApi.list` solo admite `page` y `size` (`PageParams`); la home no tiene aún la sección «Últimas jornadas».
- Al comprobarlo, `GET /gateway/places` devolvió 530 y la raíz del gateway 403: puede no estar disponible.
- `.claude/` y `CLAUDE.md` están sin versionar; `.claude/skills/migracion-ruteando` ejecuta una secuencia de changes ya terminada. `SECURITY.md` es la plantilla de GitHub con una tabla de versiones inventada.

## Goals / Non-Goals

**Goals:**
- Confirmar o refutar con el gateway real las premisas de jornadas, visitas y home, y dejarlas escritas con fecha.
- Hacerlo sin tocar datos reales ni versionar secretos.
- Que la decisión sobre las visitas se tome con evidencia y salga de este change como trabajo propio si hace falta.

**Non-Goals:**
- No se arregla ningún defecto del backend ni se cambia el proxy.
- No se rehace la extracción de fixtures ni se automatiza la verificación (no hay entorno de pruebas estable del gateway).
- No se corrige el modelo de visitas dentro de este change.

## Decisions

1. **Protocolo en tres capas, de menos a más riesgo.** (a) Disponibilidad: `npm start` y una petición sin sesión a `/gateway/...` (debe dar 401, no 403 ni 530). (b) Lecturas con un usuario de prueba que aporte quien revisa. (c) Escrituras solo en un **tenant desechable** creado con `POST /auth/register`, que no mezcla datos con los reales; cada escritura se anuncia y se autoriza antes. Alternativa: probar con el tenant real; descartada porque cambia datos de producción.
2. **Las pruebas pasan por el proxy local** (`http://localhost:<puerto>/gateway/...`), no directamente al gateway: ejercitan el mismo camino que la aplicación (reescritura, `X-Api-Key`, sin `Origin`). Los tokens viven solo en variables de la sesión de terminal, nunca se imprimen ni se guardan; las credenciales no se escriben en ningún fichero versionado.
3. **Lo que se anota son conclusiones, no respuestas en bruto.** En `gateway-api.md` van fecha, qué se hizo, qué se observó y qué sigue sin verificar; sin identificadores, correos ni tokens reales. Los fixtures solo se editan a mano, saneados, donde la forma real difiera de la del ejemplo (y se anota que ese fixture ya no viene de la colección).
4. **Árbol de decisión de las visitas** (tras 3.2 y 3.3):
   - Las paradas traen `packageId` → el modelo se confirma y no cambia nada.
   - No lo traen pero otro campo identifica el paquete (`packageInfo`, `placeId`, coordenadas) → se documenta y se abre `fix-route-visits-source`.
   - No se puede crear ni encontrar una jornada con rutas (p. ej. `journeys/plan` sigue fallando y el tenant no tiene ninguna) → se registra como **no verificable**, las visitas quedan como están y se abre un change para pedir el arreglo o un dato real. Este change sigue adelante con la home.
5. **Orden de «Últimas jornadas» según lo observado en 2.2**, de mejor a peor opción: (i) si `sort=createdAt,desc` funciona, se añade `sort` opcional a `PageParams` y se piden las cinco con `size: 5`; (ii) si no, y el orden por defecto es ascendente, se lee `totalPages` con una página y se pide la última, invirtiendo; (iii) si el orden por defecto ya es descendente, `page: 0` y `size: 5`. En todos los casos una función pura `latestJourneys(items, 5)` ordena por `createdAt` descendente (estable, sin fecha al final), de modo que la spec se cumple aunque el orden del gateway cambie. Se implementa solo la rama que se confirme.
6. **La home reutiliza los patrones existentes** para carga, vacío y error con «Reintentar» (el que encaje de `shared/data/`), pinta los accesos sin esperar la lista y no pide nada si el rol no puede abrir `/jornadas` ni en el servidor (`isPlatformBrowser`).
7. **Deuda de `.claude/`:** se versionan comandos y skills (no hay `settings.local.json` ni secretos); se borra `migracion-ruteando`, cuya secuencia fija de changes ya terminó; se añade `.claude/settings.local.json` al `.gitignore` para que un futuro fichero personal no se suba por error.
8. **`SECURITY.md`:** política mínima real (versión soportada: la rama principal; vía de aviso privada; plazo de respuesta orientativo). Necesita un contacto que solo puede dar quien mantiene el repositorio: se pregunta al aplicar esa tarea y no se inventa.

## Risks / Trade-offs

- [El gateway sigue caído (403/530)] → la tarea 1.1 lo detecta antes de gastar tiempo; si no hay disponibilidad se pausa y se deja constancia, sin implementar la home a ciegas.
- [Crear un tenant desechable deja datos en el gateway real] → se avisa y se pide autorización antes; si hay endpoint de borrado se limpia, y si no se anota que quedó un tenant de prueba.
- [`journeys/plan` sigue fallando con ids hexadecimales] → decisión 4, tercer caso: no verificable, se documenta y se pide el arreglo.
- [El orden o `sort` del gateway cambian después] → `latestJourneys` ordena siempre en el cliente.
- [Mucho trabajo manual sin repetibilidad] → se acepta: sin entorno de pruebas estable no compensa automatizarlo; el registro con fecha permite saber cuándo volver a comprobar.
- [Credenciales en el historial del terminal o en capturas] → variables de entorno en la sesión, nunca en argumentos que se impriman, y el tenant es desechable.

## Open Questions

- ¿Qué contacto de seguridad debe llevar `SECURITY.md` (correo o página de avisos privados de GitHub)? Se resuelve al aplicar la tarea 5.1; no cambia el resto del plan.

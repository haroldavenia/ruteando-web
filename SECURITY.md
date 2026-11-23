# Política de seguridad

## Versiones con soporte

Solo se mantiene la rama principal (`main`). Los avisos de seguridad se corrigen allí y no se publican parches para ramas anteriores.

## Cómo avisar de una vulnerabilidad

No abras una incidencia pública. Usa los avisos privados de GitHub:

1. Entra en la pestaña **Security** del repositorio.
2. Pulsa **Report a vulnerability** (o ve directamente a <https://github.com/haroldavenia/ruteando-web/security/advisories/new>).
3. Describe el problema, los pasos para reproducirlo y su posible impacto.

No incluyas credenciales, claves ni datos personales reales en el aviso.

## Qué esperar

- Se acusa recibo del aviso en unos 7 días.
- Se informa de si se acepta o se descarta, con una explicación, en unos 30 días.
- Si se acepta, se corrige en `main` y se da crédito a quien avisó, salvo que prefiera no aparecer.

Los plazos son orientativos: el proyecto lo mantiene una persona.

## Qué no se guarda en el repositorio

La clave del HanoIT Gateway (`GATEWAY_API_KEY`) vive solo en el servidor, en un `.env` que git ignora. Si encuentras una clave o un secreto real en el historial o en un fichero versionado, avisa por el mismo canal.

<!-- Título: <tipo>(<scope>): <descripción> (#<issue>) -->

## Historia y spec
- Closes #<issue>
- Spec: `specs/migracion-api-v1/<fase>/<ID>-<slug>.md`
- Maqueta: `docs/ui/maquetas/index.html#<id>` (o "sin interfaz")
- Endpoints `/api/v1`: 

## Alcance
<Qué cambia y qué NO cambia. Legacy retirado (`node tools/specs.mjs legacy-scan --id <ID>`): 0 coincidencias.>

## Criterios de aceptación
| CA | Estado | Evidencia (prueba / informe) |
| --- | --- | --- |
| CA-1 | ✅ / ❌ / N/V | `tests/unit/<slug>/….spec.js` · `specs/.../evidencia/<ID>/...` |

## Pruebas ejecutadas
```
npm run test:unit -- --spec <ID>        -> 
npm run test:integration                -> 
npm run test:e2e -- --grep <ID>         -> 
npm run test:api -- --spec <ID>         -> (o "no ejecutada: sin backend")
```
Cobertura del diff: <n> % (umbral 90 %). Cobertura global (informativa): <n> %.

## Informes de agentes
- [ ] Implementador: `evidencia/<ID>/…-implementador.md`
- [ ] Validador: `…-validador.md` — veredicto:
- [ ] Contendiente (modelo: …): `…-contendiente.md` — veredicto:
- [ ] Calidad y seguridad: `…-calidad-seguridad.md` — veredicto:

## Capturas (si hay interfaz)
<Antes / después y maqueta.>

## Riesgos, supuestos y pasos manuales
- 

## Checklist del autor
- [ ] Rama creada desde la rama base (ADR-0001) y vinculada al Issue
- [ ] Sin secretos, tokens ni datos personales en código, logs, fixtures o evidencia
- [ ] Textos nuevos en `es`, `en` y `es_AR`
- [ ] Spec actualizada si cambió el alcance (sección 11)

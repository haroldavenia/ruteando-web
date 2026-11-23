# Specs

Fuente de verdad de **qué** se construye. Los Issues de GitHub enlazan aquí; no duplican el contenido.

## Convención
```
specs/
  _templates/                 spec-historia.md, informe-rol.md, iniciativa.md
  migracion-api-v1/           iniciativa principal (README con fases, olas y estado del backend)
    f<N>-<slug>/<ID>-<slug>.md   UNA historia = UNA spec
    f<N>-<slug>/evidencia/<ID>/  informes por rol (AAAA-MM-DD-<rol>.md)
    trazabilidad/             legacy-inventory.json, endpoint-coverage.json, mapa-ids.json
  fabrica-agentica/           el propio arnés (HAR-001)
```
- `<ID>`: `FND` fundaciones (f0) · `ACC` acceso (f1) · `MAE` maestros (f2) · `PAQ` paquetes (f3) · `JOR` jornadas (f4) · `SEG` seguimiento (f5) · `EMP` empresa (f6) · `PLA` plataforma (f7) · `CIE` cierre (f8) · `HAR` arnés. La clave no cambia aunque cambie el Issue; la clave antigua (`F2-05`) queda en «Clave anterior».
- Campos propios de esta iniciativa: `Depende de`, `Endpoints /api/v1`, `Maqueta` (ancla en `docs/ui/maquetas/index.html`).

## Estados (campo `Estado`)
`Borrador` → `Lista` (DoR) → `En progreso` → `En revisión` → `Hecha` | `Descartada`. `Lista`, `Hecha` y `Descartada` solo con `node tools/specs.mjs estado <ID> <Estado> --humano "<nombre>"` por decisión de una persona.

## Definition of Ready (antes de `Lista`)
- [ ] `node tools/specs.mjs lint <ID>` en PASS (secciones, CA Dado/Cuando/Entonces con caso de prueba, dependencias existentes, maqueta existente).
- [ ] Comportamiento legacy inventariado con su destino; contrato `/api/v1` con fixture o «capturar».
- [ ] Maqueta confirmada por una persona si hay interfaz.
- [ ] Dependencias cerradas o aceptadas; preguntas bloqueantes resueltas.
- [ ] Issue creado y enlazado.

## Definition of Done
- [ ] `node tools/specs.mjs dod <ID>` en PASS: informes de implementador, validador, contendiente y calidad-seguridad con veredicto PASS o PASS WITH GAPS; cada CA con prueba `[<ID> CA-n]`; sección 10 completa; sin pruebas enfocadas; `legacy-scan` de la historia en 0.
- [ ] CI verde (incluido `e2e`), cobertura de diff ≥ 90 % o excepción aprobada.
- [ ] Pantalla igual a la maqueta (capturas en el PR).
- [ ] PR aprobado por una persona y fusionado; Issue cerrado; spec en `Hecha`.

## Iniciativas
| Iniciativa | Objetivo | Estado |
| --- | --- | --- |
| [migracion-api-v1](migracion-api-v1/README.md) | 41 historias en 9 fases: todo el AngularJS sobre `/api/v1` + pantallas nuevas (sin app móvil del conductor) | F0 implementada (propuesta) |
| [fabrica-agentica](fabrica-agentica/README.md) | Arnés: specs, GitHub Flow, agentes y CI | En revisión |

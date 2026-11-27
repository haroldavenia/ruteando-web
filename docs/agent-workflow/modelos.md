# Asignación de modelos por rol

## Restricción verificada
Un subagente solo puede fijar `model: inherit | flash | pro` (antigravity.google/docs/subagents). `inherit` usa el modelo que elegiste en el selector para la sesión principal. La documentación **no** dice a qué modelo concreto mapean `pro` y `flash`; un anuncio de Google Cloud (2026-10-20) los describe como niveles "Gemini Pro" y "Gemini Flash".

## Asignación efectiva
| Rol | Tier | Modelo recomendado en el selector (sesión) | Motivo |
| --- | --- | --- | --- |
| Orquestador | `inherit` | **Claude Opus 5.5 (thinking)**; alternativa Gemini 4 Argon | Contexto amplio y razonamiento para descomponer y coordinar |
| Implementador | `inherit` | **Claude Opus, esfuerzo High** (vía el selector de la sesión) | Generación de código AngularJS 1.3/Node; misma ventana de reglas |
| Validador | `inherit` | **Claude Opus, esfuerzo High** (vía el selector de la sesión), contexto limpio | Contrastar requisitos vs. cambios |
| Contendiente | `pro` | **Gemini 4 Neon** (decisión 2026-11-25; ver abajo) | **Familia distinta** a la sesión si esta es Claude |
| Calidad y seguridad | `pro` | **Gemini 4 Neon** (decisión 2026-11-25; ver abajo) | Revisión crítica apoyada en herramientas |

Para que el contendiente use un modelo distinto al implementador y al validador, **la sesión principal debe usar un modelo Claude**. Si eliges un modelo Gemini en la sesión, el contendiente puede terminar en la misma familia o el mismo modelo: debe declararlo en su informe.

Modelos a no usar: Claude Sonnet/Opus 4.6 y GPT-OSS-120b figuran como retirados el 2026-11-18 en la tabla oficial. Disponibilidad por plan: Claude 5.5 requiere Google AI Pro (no trial), Ultra o Enterprise; en Enterprise, un administrador debe habilitar los modelos de partners.

## Decisión 2026-11-25 (Harold Avenia)
Implementador y validador con **Claude Opus, esfuerzo High**; contendiente y calidad-seguridad con **Gemini 4 Neon**; orquestador sin cambios. Como un subagente solo admite `inherit | flash | pro`, el modelo Claude se fija en el **selector de la sesión** que lanza los subagentes (el orquestador también lo usa) o en el selector de la conversación propia cuando el rol se ejecuta en una conversación aparte.

Gemini 4 Neon tampoco se puede escribir en `model:`. Se mantiene `pro` (garantiza familia Gemini cuando el orquestador lanza el subagente) y se comprueba en el panel qué modelo muestra `pro`. Si no es Neon, contendiente y calidad-seguridad se ejecutan en conversaciones aparte con **Gemini 4 Neon** en el selector, y cada informe lo declara en «Agente / modelo efectivo».

## Por verificar en tu instalación (M-09, M-10)
| Dato | Valor observado | Fecha / quién |
| --- | --- | --- |
| Plan de Antigravity de la empresa | | |
| Modelos visibles en el selector | | |
| Modelo que muestra el panel para `pro` | | |
| Modelo que muestra el panel para `flash` | | |

## Cómo cambiar la asignación
1. Edita `model:` en `.agents/agents/<rol>.md` (solo `inherit`, `flash`, `pro`).
2. `node tools/validate-harness.mjs .`
3. Actualiza esta tabla y abre un PR (tipo `chore`, scope `agentes`).

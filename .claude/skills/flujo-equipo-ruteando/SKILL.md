---
name: flujo-equipo-ruteando
description: Flujo de trabajo en equipo de ruteando-web: nombres de ramas, mensajes de commit, descripción de PR, PRs encadenados, comentarios y cierre con OpenSpec. Úsalo al crear una rama, hacer commit, abrir o actualizar un PR, responder revisiones o fusionar, para seguir siempre el mismo patrón.
---

# Flujo de equipo en ruteando-web

Patrón extraído del historial real (PRs #1 a #10). Todo en **español**; identificadores de código, rutas y nombres de ramas en inglés. No inventes variaciones: si algo no está aquí, imita el último PR fusionado (`gh pr view <n>`).

## 1. Ramas

- Salen de `main` actualizada (`git switch main && git pull --ff-only`), salvo en una cadena de PRs (ver §5).
- Nombre: `<tipo>/<slug-en-kebab-case>`, con `feat/`, `fix/`, `chore/`, `docs/` o `ci/`. Ejemplos reales: `feat/zones-management`, `feat/modernize-app-ui`, `feat/fix-inactive-package-statuses`, `chore/upgrade-angular-21`.
- Si hay un change de OpenSpec, el slug **coincide con el nombre del change** (`feat/add-ci-and-integrate` ↔ `openspec/changes/add-ci-and-integrate`).
- Una rama = un change o un tema. No mezcles temas no relacionados.
- Nunca se hace push directo a `main`; todo entra por PR. Nunca `--force` sobre ramas compartidas sin avisar.

## 2. Commits

Formato Conventional Commits en español, en minúscula tras los dos puntos, sin punto final:

```
<tipo>(<ámbito>): <qué cambia, en presente/imperativo descriptivo>

<cuerpo opcional: el porqué y lo que queda pendiente>

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```

- Tipos usados: `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`.
- Ámbitos usados: `ng-ruteando` (frontend), `server`, `openspec`, `deps`. Sin ámbito en `docs:`, `ci:` y cambios transversales.
- Commits pequeños y por intención: el código de la funcionalidad (`feat(ng-ruteando): …`), el change de OpenSpec aparte (`chore(openspec): change <nombre> (N de M tareas; X sin verificar)`), la documentación aparte (`docs: …`).
- Estado del change en el asunto cuando se avanza por tareas: `(14 de 15 tareas; 2.2 sin verificar)`.
- Al cerrar: `chore(openspec): archiva <changes> y sincroniza specs`.
- La línea `Co-Authored-By` va siempre al final cuando el commit lo crea Claude.
- Antes de commitear: `npm --prefix ng-ruteando run test:ci`, `npm run test:server` y, si tocaste specs, `openspec validate --specs --strict`. El CI exige lo mismo.

## 3. Pull requests

- Siempre contra `main` (o contra la rama del PR anterior en una cadena, §5). Se abre con `gh pr create`.
- **Título**: frase en español que describe el resultado, sin prefijo de tipo ni punto final. Ej.: «Interfaz moderna en toda la aplicación: tema claro y oscuro, shell, tarjetas y etiquetas de estado».
- **Cuerpo** (markdown), con estas secciones en este orden, omitiendo las que no apliquen:

```
## Resumen
<1-2 frases: qué change implementa y por qué ahora>

- **Pieza 1** … (viñetas en negrita + explicación concreta, con rutas y cifras)

## Verificación previa   (o «Cómo probarlo»)
<comandos exactos y resultados: nº de pruebas, auditoría, compilación>

## Después de fusionar   (solo si quien mantiene debe hacer algo)
## Pendiente             (tareas sin verificar, bloqueos, mejoras futuras)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- Cita cifras reales (p. ej. «1191 pruebas», «0 vulnerabilidades de producción») sacadas de una ejecución, no de memoria.
- Declara siempre lo **no verificado** en «Pendiente». No afirmes «todo en verde» si el CI no ha terminado.
- Etiquetas y reviewers: hoy no se usan; si el equipo los define, añádelos con `gh pr edit`.

## 4. Revisión, comentarios y fusión

- Antes de pedir revisión: CI (`ci`) en verde (`gh pr checks <n>`). La comprobación obligatoria de `main` es **`ci`**.
- Comentarios del PR en español, concretos y accionables: qué cambió, en qué fichero/línea, qué se decide. Responde cada comentario de revisión y di el commit que lo resuelve; no resuelvas hilos ajenos.
- Para cambios pedidos en revisión, **nuevos commits** en la misma rama (no reescribas el historial una vez abierta la revisión) y actualiza la descripción del PR si cambia el alcance.
- Si `main` avanza: `git merge origin/main` en la rama (como en `b8e4efb`), no rebase de ramas ya publicadas.
- Fusión: *merge commit* de GitHub (`Merge pull request #N from <usuario>/<rama>`), hecha por quien mantiene el repo tras la aprobación. Claude no fusiona ni protege `main` sin que se lo pidan.
- Para revisar el PR de otra persona: `/code-review` (con `--comment` solo si se pide publicar comentarios).

## 5. PRs encadenados

Cuando un change depende de otro aún sin fusionar (ej. `modernize-app-ui` sobre `modernize-access-ui`):

1. Crea la rama desde la del PR anterior y abre el PR **apuntando a esa rama**.
2. Indícalo en el resumen: «Depende del PR anterior de la cadena (apunta a su rama)».
3. Al fusionarse el anterior, GitHub reapunta a `main`; resuelve con `git merge origin/main` si hace falta.
4. El CI corre en PRs con cualquier rama base.

## 6. Cierre con OpenSpec

Cada rama de funcionalidad lleva su change (`openspec/changes/<nombre>/`, con tareas numeradas). Se avanza con `/opsx:apply`, se sincronizan specs con `/opsx:sync` y se archiva con `/opsx:archive` (queda en `openspec/changes/archive/AAAA-MM-DD-<nombre>`). Las tareas que no se pudieron verificar se dejan anotadas en el commit y en «Pendiente» del PR.

## 7. Seguridad y límites

- `GATEWAY_API_KEY` y `.env` nunca se versionan; no los pegues en PRs, comentarios ni commits.
- Acciones de cara al exterior (push, abrir/cerrar/fusionar PR, comentar) solo cuando el usuario lo pide; la aprobación de una vez no vale para la siguiente.
- Vulnerabilidades: avisos privados de GitHub (`SECURITY.md`), no issues públicos.

# Proposal

## Why

El proyecto tenía dos `package-lock.json` (raíz y `ng-ruteando/`) y arrastraba el defecto de npm 10.9 al instalar desde cero (`edgesOut`), que obligaba a instalar `npm@11` en la CI y en la imagen de Docker. pnpm da un solo lockfile para todo el repositorio, instalaciones más rápidas con almacén compartido, dependencias estrictas (sin «dependencias fantasma») y auditoría en un solo comando.

## What Changes

- Un workspace pnpm (`pnpm-workspace.yaml`: raíz = servidor, `ng-ruteando`) con **un solo `pnpm-lock.yaml`**; se retiran los dos `package-lock.json` y se ignoran en git.
- `packageManager: pnpm@10.34.9` en `package.json` (fuente única de la versión para corepack, la CI y Docker).
- Scripts: `build:web` pasa a `pnpm --filter ng-ruteando run build`.
- CI: `pnpm/action-setup` (fijada por SHA), caché `pnpm`, `pnpm install --frozen-lockfile`, sin `npm@11`, auditoría con `pnpm audit --prod`.
- Docker de desarrollo: pnpm por corepack en `Dockerfile.dev`, un solo `pnpm install` en el servicio `deps` (hash de `pnpm-lock.yaml`) y volumen para el almacén.
- Mensajes del servidor («Ejecuta `pnpm run build:web`») y su prueba; documentación (`CLAUDE.md`, `README.md`, `ng-ruteando/README.md`, habilidades de `.claude/`, specs vigentes).
- Sin cambios en el código de la aplicación ni en `package.json` de dependencias.

## Fuera de alcance

Imagen de producción para Coolify (no está en el repositorio; ver «Despliegue» en `design.md`: hay que cambiar a mano los comandos configurados allí). Actualizar dependencias (la migración conserva las versiones). Subir a pnpm 11 o 12.

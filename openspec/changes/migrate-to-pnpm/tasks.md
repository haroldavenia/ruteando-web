# Tasks

## 1. Línea base (con npm, antes de tocar nada)

- [x] 1.1 `npm run test:server` (52 correctas), `npm --prefix ng-ruteando run test:ci` (2127 de 2130, 3 omitidas) y `npm --prefix ng-ruteando run build` (bundle inicial 598,95 kB, sin avisos); copia de los dos `package-lock.json`

## 2. Migración

- [x] 2.1 `packageManager`, `pnpm-workspace.yaml` y `build:web`
- [x] 2.2 Lockfile único conservando versiones (`pnpm import` por proyecto + fusión); comparar con los lockfiles de npm: 0 versiones distintas salvo las transitivas de `express` del servidor
- [x] 2.3 `ignoredBuiltDependencies` (cuatro paquetes); instalación limpia sin avisos
- [x] 2.4 Retirar `package-lock.json` (raíz y `ng-ruteando`) y añadirlo a `.gitignore`
- [x] 2.5 Mensajes del servidor y su prueba (`pnpm run build:web`)
- [x] 2.6 CI (`pnpm/action-setup@73e46992…` v6.1.1, caché, `--frozen-lockfile`, auditoría)
- [x] 2.7 Docker: `Dockerfile.dev` con corepack y `compose.yaml` (`deps`, comandos, volumen del almacén)
- [x] 2.8 Documentación: `CLAUDE.md`, `README.md`, `ng-ruteando/README.md`, habilidades de `.claude/`, specs vigentes, comentarios de scripts

## 3. Verificación (con pnpm, mismas cifras que la línea base)

- [x] 3.1 `pnpm run test:server`: 52 correctas
- [x] 3.2 `pnpm --filter ng-ruteando run test:ci`: 2127 de 2130 (3 omitidas), igual que la base
- [x] 3.3 `pnpm run build:web`: bundle inicial 598,95 kB, sin avisos, 26 rutas prerenderizadas
- [x] 3.4 `pnpm start` (modo mock): `/`, `/acceso`, `/ngsw.json` 200, `/gateway` 401 (proxy vivo), `/api/x` 404, brotli y CSP presentes
- [x] 3.5 `pnpm --filter ng-ruteando start --host 0.0.0.0 --poll 2000 --port 4299`: `ng serve` arranca, sirve y proxifica `/gateway`
- [x] 3.6 SSR: `pnpm --filter ng-ruteando run serve:ssr:ng-ruteando` sirve `/acceso`
- [x] 3.7 `pnpm audit --prod --audit-level=high` limpio; `node scripts/i18n-check.mjs` (con y sin `--spanish`) en verde
- [x] 3.8 Copia limpia (solo ficheros versionados): `pnpm install --frozen-lockfile`, pruebas del servidor y compilación en verde
- [x] 3.9 Docker en Linux (Docker 29.9.2): imagen con corepack, `deps` instala con `--frozen-lockfile` sin scripts de instalación, `docker compose up web` sirve :4200 y proxifica `/gateway`, el perfil `test` pasa 2127 de 2130 con Chromium y `prod-like` compila y sirve :3000. Ojo: una imagen anterior (p. ej. `ruteando-web-app`) no se reconstruye sola y falla con `pnpm: not found`
- [ ] 3.10 CI del pull request en verde (Linux, Chrome de GitHub)

## 4. Después de fusionar (manual)

- [ ] 4.1 Cambiar los comandos de Coolify (ver `design.md`) **antes** de que despliegue `main`
- [ ] 4.2 Comprobar el primer pull request de Dependabot (lunes): que actualice `pnpm-lock.yaml`
- [ ] 4.3 Cada persona del equipo: `corepack enable`, borrar `node_modules` (raíz y `ng-ruteando`) y `pnpm install`; con Docker, `docker compose --profile prod-like --profile test build` una vez

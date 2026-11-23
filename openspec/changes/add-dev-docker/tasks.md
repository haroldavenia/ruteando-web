# Tasks

- [x] 1. `Dockerfile.dev` (destinos `dev` y `test`) y `.dockerignore`
- [x] 2. `compose.yaml`: `mock-gateway`, `web`, perfiles `prod-like` y `test`; volúmenes con nombre para ambos `node_modules`; `healthcheck` del mock
- [x] 3. Comprobar que `scripts/mock-gateway.mjs` escucha en `0.0.0.0` (no solo `127.0.0.1`) y que `proxy.conf.js` toma `GATEWAY_URL` del entorno
- [x] 4. Verificar: `docker compose up` → `http://localhost:4200` inicia sesión con `admin@example.invalid` / `demo1234`; editar un `.ts` recarga (verificado: login por el proxy contra el mock y recarga al guardar con `--poll`)
- [x] 5. Verificar: `docker compose --profile prod-like up app` sirve en :3000 con cabeceras; `docker compose --profile test run --rm test` pasa las pruebas
- [x] 6. Atajos en `package.json` (`docker:dev`, `docker:test`), sección «Con Docker» en `README.md` y una línea en `CLAUDE.md`
- [x] 7. Medir arranque en frío y tiempo de recarga en Windows; si el sondeo es lento, documentar la alternativa WSL2 (medido: `deps` ~30 s con la caché de npm, primera compilación de `ng serve` ~25 s y recarga al guardar detectada con `--poll 2000`; sin sondeo no se probó)

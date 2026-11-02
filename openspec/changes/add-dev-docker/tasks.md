# Tasks

- [ ] 1. `Dockerfile.dev` (destinos `dev` y `test`) y `.dockerignore`
- [ ] 2. `compose.yaml`: `mock-gateway`, `web`, perfiles `prod-like` y `test`; volúmenes con nombre para ambos `node_modules`; `healthcheck` del mock
- [ ] 3. Comprobar que `scripts/mock-gateway.mjs` escucha en `0.0.0.0` (no solo `127.0.0.1`) y que `proxy.conf.js` toma `GATEWAY_URL` del entorno
- [ ] 4. Verificar: `docker compose up` → `http://localhost:4200` inicia sesión con `admin@example.invalid` / `demo1234`; editar un `.ts` recarga
- [ ] 5. Verificar: `docker compose --profile prod-like up app` sirve en :3000 con cabeceras; `docker compose --profile test run --rm test` pasa las pruebas
- [ ] 6. Atajos en `package.json` (`docker:dev`, `docker:test`), sección «Con Docker» en `README.md` y una línea en `CLAUDE.md`
- [ ] 7. Medir arranque en frío y tiempo de recarga en Windows; si el sondeo es lento, documentar la alternativa WSL2

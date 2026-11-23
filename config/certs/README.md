# Certificados públicos de backends de desarrollo

Solo certificados **públicos** (PEM). Nunca claves privadas.

| Archivo | Backend | Nombres válidos | Vence | SHA-256 |
| --- | --- | --- | --- | --- |
| `hanoit-dev.pem` | `https://hanoit:8000` (autofirmado, `CN=hanoit`, emisor = sujeto) | `DNS:hanoit`, `DNS:localhost`, `IP:127.0.0.1` | 2036-04-21 | `96:9C:4F:E0:E3:EC:3B:6A:E0:97:3B:B0:EE:AA:F9:6E:DD:1B:C6:09:DA:EB:90:9E:9A:AE:73:12:3A:C1:64:CB` |

Uso: `BACKEND_CA_FILE=config/certs/hanoit-dev.pem` en `.env` (lo cargan `server/proxy.js` y `tests/api/_client.mjs`).
La máquina del frontend debe resolver `hanoit` a la IP del backend (`/etc/hosts` o `C:\Windows\System32\drivers\etc\hosts`): llamar por IP u otro nombre falla la verificación de nombre, que no se desactiva. Puerto 8000 abierto hacia esa máquina.
No usar `rootCA.crt` (CA de mkcert de otra máquina: no firmó este backend).

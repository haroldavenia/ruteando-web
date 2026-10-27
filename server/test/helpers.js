// Utilidades de las pruebas del servidor: arrancan server/server.js de verdad en un puerto libre.
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const SERVER = path.join(__dirname, '..', 'server.js');

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
    probe.on('error', reject);
  });
}

/**
 * Arranca el servidor. `env` se suma al entorno; las claves con valor `undefined` se eliminan.
 * Devuelve { base, child, log() } con todo lo que el servidor haya escrito.
 */
async function startServer({ webDist, env = {} } = {}) {
  const port = await freePort();
  const childEnv = {
    ...process.env,
    PORT: String(port),
    MONGO_URI: 'mongodb://127.0.0.1:1/prueba',
    NODE_ENV: 'test',
    ...(webDist ? { WEB_DIST: webDist } : {}),
    ...env,
  };
  for (const key of Object.keys(childEnv)) {
    if (childEnv[key] === undefined) delete childEnv[key];
  }
  const child = spawn(process.execPath, [SERVER], { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('El servidor no arrancó:\n' + output)), 15000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('exit', () => reject(new Error('El servidor terminó al arrancar:\n' + output)));
  });
  return { base: `http://127.0.0.1:${port}`, child, log: () => output };
}

module.exports = { freePort, startServer };

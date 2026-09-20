/**
 * BendLens Dedicated Next.js Production Engine Runner
 *
 * Runs inside a standalone background Node.js process spawned by Electron via:
 *   spawn(process.execPath, [runnerScript], {
 *     env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
 *   })
 *
 * Decoupling this server from the Electron Main Process guarantees that heavy
 * CPU workloads (AST parsing, directory scans, Mermaid generation, downloads)
 * run in a separate OS thread and NEVER block Electron's Windows message pump
 * or cause Windows "(Not Responding)" window hangs.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const projectDir = process.env.BENDLENS_APP_DIR || path.join(__dirname, '..');
const port = parseInt(process.env.PORT, 10) || 3000;
const host = '127.0.0.1';

// Anchor working directory for all filesystem operations
try {
  process.chdir(projectDir);
} catch (err) {
  console.warn('[server-runner] Could not chdir to projectDir:', err.message);
}

process.env.NODE_ENV = 'production';
process.env.BENDLENS_APP_DIR = projectDir;

console.log(`[*] [server-runner] Booting BendLens production engine in isolated background process (pid ${process.pid}) on port ${port}...`);

let nextFactory = null;
try {
  nextFactory = require('next');
} catch (err1) {
  try {
    nextFactory = require(path.join(projectDir, 'node_modules', 'next'));
  } catch (err2) {
    console.error('[!] [server-runner] Could not load Next.js module:', err1.message, err2.message);
    process.exit(1);
  }
}

const nextApp = nextFactory({ dev: false, dir: projectDir, hostname: host, port });
const handle = nextApp.getRequestHandler();

const prepareTimeout = setTimeout(() => {
  console.error('[!] [server-runner] Engine prepare() timed out after 60s');
  process.exit(1);
}, 60000);

nextApp
  .prepare()
  .then(() => {
    clearTimeout(prepareTimeout);
    const server = http.createServer((req, res) => handle(req, res));

    server.listen(port, host, () => {
      console.log(`[*] [server-runner] BendLens production engine listening on http://${host}:${port}`);
      // Signal parent Electron process via IPC if available
      if (typeof process.send === 'function') {
        try {
          process.send({ type: 'ready', port });
        } catch {}
      }
    });

    server.on('error', (err) => {
      console.error('[!] [server-runner] HTTP server error:', err);
      process.exit(1);
    });

    // Graceful shutdown
    const cleanup = () => {
      console.log('[*] [server-runner] Shutting down embedded engine...');
      try {
        server.close(() => process.exit(0));
      } catch {
        process.exit(0);
      }
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    process.on('message', (msg) => {
      if (msg === 'shutdown' || (msg && msg.type === 'shutdown')) {
        cleanup();
      }
    });
  })
  .catch((err) => {
    clearTimeout(prepareTimeout);
    console.error('[!] [server-runner] Failed to prepare Next.js application:', err);
    process.exit(1);
  });

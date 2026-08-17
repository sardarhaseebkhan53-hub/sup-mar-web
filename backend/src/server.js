import http from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { assertProductionEnv, env } from './config/env.js';
import { configureRealtime } from './realtime/index.js';

assertProductionEnv();
await connectDatabase();

const server = http.createServer(app);
configureRealtime(server);

server.listen(env.port, '0.0.0.0', () => {
  console.info(`[server] QAVLIO API listening on http://0.0.0.0:${env.port}${env.apiPrefix}`);
});

async function shutdown(signal) {
  console.info(`[server] ${signal} received; shutting down.`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

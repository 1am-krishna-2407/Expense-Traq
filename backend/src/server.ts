import { createApp } from './app';
import { prisma } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info('server_started', { port: env.PORT, env: env.NODE_ENV });
});

let shuttingDown = false;

/** Stop accepting connections, let in-flight requests finish, then release the DB pool. */
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutdown_started', { signal });

  const forceExit = setTimeout(() => {
    logger.error('shutdown_timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async (err) => {
    await prisma.$disconnect().catch(() => undefined);
    logger.info('shutdown_complete');
    process.exit(err ? 1 : 0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason: reason instanceof Error ? reason.stack : String(reason) });
});

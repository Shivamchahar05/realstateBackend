import { createApp } from './app.js';
import { env } from './config/env.js';
import { sequelize, syncDatabase } from './db/models/index.js';

async function bootstrap() {
  const app = createApp();

  await syncDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`API running on ${env.APP_URL} (port ${env.PORT})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down...`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch(async (error) => {
  console.error('Failed to start server', error);
  await sequelize.close();
  process.exit(1);
});

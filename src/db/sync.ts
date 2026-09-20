/**
 * Manual sync command:
 *   npm run db:sync
 *
 * Server start pe bhi sync chalta hai (DB_SYNC_ALTER=true).
 */
import { sequelize, syncDatabase } from './models/index.js';

async function main() {
  await syncDatabase();
  await sequelize.close();
  console.log('Done.');
}

main().catch(async (error) => {
  console.error(error);
  await sequelize.close();
  process.exit(1);
});

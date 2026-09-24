import { execSync } from 'node:child_process';
import path from 'node:path';
import { TEST_DATABASE_URL } from './setup-env';

/**
 * Brings the disposable test database up to exactly the committed migrations (Plan §22,
 * TEST-001) using the non-destructive `migrate deploy`. Isolation between tests comes from
 * truncating tables in each suite's beforeEach (tests/helpers.ts → resetDb).
 *
 * Safety: the suite truncates tables, so it refuses to run against any database whose name
 * doesn't end in "_test" — a mis-set TEST_DATABASE_URL can never wipe real data.
 */
export default function globalSetup() {
  const dbName = new URL(TEST_DATABASE_URL).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${dbName}": the test database name must end with "_test".`);
  }
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}

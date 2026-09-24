/**
 * Runs before every test file (before any app module is imported), so config/env.ts
 * validates a hermetic test configuration. dotenv never overrides values set here.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://rupeeflow:rupeeflow@localhost:5433/rupeeflow_test?schema=public';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'test-secret-that-is-definitely-longer-than-32-characters';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.BCRYPT_COST = '4';
process.env.AUTH_RATE_LIMIT_MAX = '10000';
process.env.LOG_REQUESTS = 'false';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.COOKIE_SAMESITE = 'strict';

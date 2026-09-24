/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  // Test env (separate DB, low bcrypt cost, relaxed rate limits) is set before any module loads.
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  // Fresh, migrated test schema once per run (TEST-001).
  globalSetup: '<rootDir>/tests/global-setup.ts',
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/**/*.types.ts'],
  coverageReporters: ['text-summary', 'lcov'],
};

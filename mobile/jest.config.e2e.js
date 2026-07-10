/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testTimeout: 120000,
  maxWorkers: 1,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: [
    '<rootDir>/e2e/**/*.test.ts',
    '<rootDir>/apps/*/e2e/**/*.test.ts',
  ],
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  setupFilesAfterSetup: [],
};

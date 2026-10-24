module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/prisma/**',
      "apps/api/src/**/*.{ts,tsx}",
  "!apps/api/src/**/*.spec.{ts,tsx}", // Excluye explícitamente los archivos .spec
  "!apps/api/src/**/*.test.{ts,tsx}"
  ],
  coverageDirectory: './coverage',
};
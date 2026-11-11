export default {
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
      "apps/web/src/**/*.{ts,tsx}",
  "!apps/web/src/**/*.spec.{ts,tsx}", // Excluye explícitamente los archivos .spec
  "!apps/web/src/**/*.test.{ts,tsx}"
  ],
  coverageDirectory: './coverage',
};
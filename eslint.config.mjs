import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'apps/web/playwright-report/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['apps/**/*.ts', 'apps/**/*.tsx'],
    rules: {
      // TypeScript already checks type correctness; existing test doubles use explicit any.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
);

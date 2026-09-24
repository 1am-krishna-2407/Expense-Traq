import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Section 12: only repositories (and the db client itself) may import Prisma Client.
    files: ['src/**/*.ts'],
    // money.ts only uses Prisma's Decimal class (no database access).
    ignores: ['src/**/*.repository.ts', 'src/config/db.ts', 'src/server.ts', 'src/utils/money.ts', 'src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@prisma/client',
              message: 'Only *.repository.ts files may import Prisma Client (Section 12).',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['**/config/db'],
              message: 'Only *.repository.ts files may use the Prisma client (Section 12).',
            },
          ],
        },
      ],
    },
  },
);

import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // `_name` = intentionally unused (e.g. Express's 4-arg error handler, omitting a field).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
);

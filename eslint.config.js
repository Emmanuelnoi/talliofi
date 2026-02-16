import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    files: ['src/app/router.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message: 'Domain layer must not import from features.',
            },
            {
              group: ['@/data/*'],
              message: 'Domain layer must not import from data layer.',
            },
            {
              group: ['@/hooks/*'],
              message: 'Domain layer must not import from hooks.',
            },
            {
              group: ['@/stores/*'],
              message: 'Domain layer must not import from stores.',
            },
            {
              group: ['@/components/*'],
              message: 'Domain layer must not import from components.',
            },
            {
              group: ['@/app/*'],
              message: 'Domain layer must not import from app layer.',
            },
            {
              group: ['react', 'react-dom'],
              message: 'Domain layer must not depend on React.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
]);

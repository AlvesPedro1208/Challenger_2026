import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import {
  complexityBudgetRules,
  errorTierRules,
  sharedIgnores,
  testFileRules,
  typeAwareErrorRules,
} from '../eslint.base.mjs';

// Demo server: Node + TypeScript, plus the browser-side control panel in `panel/`.
export default defineConfig([
  js.configs.recommended,

  // TypeScript sources.
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      ...errorTierRules,
      ...typeAwareErrorRules,
      ...complexityBudgetRules,
    },
  },
  // Test files: same error tier, relaxed size budget. `max-params` deliberately
  // stays on -- a five-parameter test helper is still a smell.
  {
    files: ['test/**/*.ts'],
    rules: {
      ...errorTierRules,
      ...typeAwareErrorRules,
      'max-params': complexityBudgetRules['max-params'],
      ...testFileRules,
    },
  },

  // Control panel: a plain browser script served as a static asset, with no build
  // step and no transpiler. It is deliberately written in ES5 style (IIFE, `var`,
  // function expressions), so `no-var`/`prefer-const` stay off here instead of
  // demanding a stylistic rewrite of a file that works. Only the always-a-bug
  // rules from js.configs.recommended apply.
  {
    files: ['panel/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: globals.browser,
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      ...complexityBudgetRules,
    },
  },

  globalIgnores(sharedIgnores),
]);

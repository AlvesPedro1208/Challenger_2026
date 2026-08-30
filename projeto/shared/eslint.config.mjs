import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

import {
  complexityBudgetRules,
  errorTierRules,
  sharedIgnores,
  typeAwareErrorRules,
} from '../eslint.base.mjs';

// Shared package: plain TypeScript, no framework, no runtime globals of its own.
export default defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...errorTierRules,
      ...typeAwareErrorRules,
      ...complexityBudgetRules,
    },
  },

  globalIgnores(sharedIgnores),
]);

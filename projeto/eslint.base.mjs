// Shared lint taste for every workspace of the monorepo.
//
// Two severity tiers only, per the toolkit quality-gate philosophy:
//   error -> always a bug or always unsafe, never a matter of taste;
//   warn  -> refactoring pressure and heuristics with a real false-positive rate.
//
// A new rule NEVER lands as `error` while the codebase still violates it. It lands
// as `warn`, the violation count is burned down, and only then is it promoted.
// Formatting is deliberately absent: it is a formatter's job, not ESLint's.

/** Always-a-bug rules. Safe for every package (core + typescript-eslint only). */
export const errorTierRules = {
  'no-var': 'error',
  'prefer-const': 'error',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-unused-vars': 'off', // superseded by the typescript-eslint version below
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    },
  ],
};

/**
 * Type-aware rules. The toolkit keeps these in a separate, non-blocking tier because
 * full type information is slow and memory-hungry at scale. This monorepo is ~90
 * source files and the whole type-aware pass costs well under a second per package,
 * so they run in the fast path instead. Every rule here is zero-violation today and
 * catches a real bug class, which is what earns them `error`. If the codebase grows
 * to the point where this hurts, split them into an `eslint.typed.config.mjs` and a
 * separate `lint:types` script rather than downgrading them.
 */
export const typeAwareErrorRules = {
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
};

/**
 * Size and complexity budget. Pure refactoring pressure, so every entry is `warn`
 * and none of them may ever fail the lint gate.
 */
export const complexityBudgetRules = {
  complexity: ['warn', 12],
  'max-depth': ['warn', 4],
  'max-statements': ['warn', 20],
  'max-params': ['warn', 4],
  'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
  'max-nested-callbacks': ['warn', 3],
};

/**
 * Relaxations for test files. Long, repetitive and deeply nested test bodies are
 * normal; `max-params` stays on because a 5-parameter test helper is still a smell.
 */
export const testFileRules = {
  'max-statements': 'off',
  'max-lines-per-function': 'off',
  'max-nested-callbacks': 'off',
  complexity: 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
};

/** Ignores shared by every package. */
export const sharedIgnores = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '**/*.tsbuildinfo',
];

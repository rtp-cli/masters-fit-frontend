module.exports = {
  root: true,
  // Generated / native / build output — not linted.
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    '.expo/',
    'dist/',
    // Design-handoff prototype (HTML/JSX references, not app source).
    'design_handoff_workout_generation/',
  ],
  extends: ['expo', 'plugin:tailwindcss/recommended', 'prettier'],
  plugins: [
    'prettier',
    'unicorn',
    '@typescript-eslint',
    'unused-imports',
    'tailwindcss',
    'simple-import-sort',
    'eslint-plugin-react-compiler',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    // Prettier is intentionally OFF: it was never enforced (no .prettierrc /
    // husky / lint-staged) and cosmetic formatting has near-zero value for this
    // solo, AI-maintained repo. Keeping it on only buried the real, bug-shaped
    // findings under thousands of formatting warnings. (chore/lint-backlog)
    'prettier/prettier': 'off',
    'unicorn/filename-case': [
      'error',
      {
        case: 'kebabCase',
        ignore: [
          '/android',
          '/ios',
          // Add patterns for dynamic route files
          '\\[.*\\]', // Matches [userId], etc.
          '\\(.*\\)', // Matches (app), (auth), etc. for expo router groups
        ],
      },
    ],
    'max-params': ['error', 4], // Limit the number of parameters in a function to use object instead
    // OFF for now: the worst offenders (e.g. app/(tabs)/workout.tsx ~2500 lines,
    // which also violates the app/=routing-only rule) need dedicated refactors,
    // not an inline disable sweep. TODO: re-enable after those are broken up.
    'max-lines-per-function': 'off',
    'react/display-name': 'off',
    'react/no-inline-styles': 'off',
    'react/destructuring-assignment': 'off', // Vscode doesn't support automatically destructuring, it's a pain to add a new variable
    'react/require-default-props': 'off', // Allow non-defined react props as undefined
    '@typescript-eslint/comma-dangle': 'off', // Avoid conflict rule between Eslint and Prettier
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
        disallowTypeAnnotations: true,
      },
    ], // Ensure `import type` is used when it's necessary
    'import/prefer-default-export': 'off', // Named export is easier to refactor automatically
    'import/no-cycle': ['error', { maxDepth: '∞' }],
    'tailwindcss/classnames-order': [
      'off',
      {
        officialSorting: true,
      },
    ], // Follow the same ordering as the official plugin `prettier-plugin-tailwindcss`
    'simple-import-sort/imports': 'error', // Import configuration for `eslint-plugin-simple-import-sort`
    'simple-import-sort/exports': 'error', // Export configuration for `eslint-plugin-simple-import-sort`
    '@typescript-eslint/no-unused-vars': 'off',
    'tailwindcss/no-custom-classname': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    {
      // Configuration for testing files
      files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
      extends: ['plugin:testing-library/react'],
    },
    {
      // Plain JS files (config files, app entry) aren't part of tsconfig, so
      // type-aware rules have no parserServices for them. Disable the
      // type-info parse + the type-aware rule here so `eslint .` doesn't crash.
      files: ['*.js', '*.cjs'],
      parserOptions: { project: null },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
  ],
};


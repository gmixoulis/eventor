// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Build output, generated types and other agents' worktrees are not this project's source.
    ignores: ['dist/*', '.expo/**', '.claude/**'],
  },
  {
    // Node scripts and the Vercel entry run outside the app bundle, so the app-only env rule does not apply.
    files: ['scripts/**', 'api/**'],
    languageOptions: {
      globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' },
    },
    rules: {
      'expo/no-dynamic-env-var': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['scripts/**/*.test.js'],
    languageOptions: { globals: { test: 'readonly', expect: 'readonly', describe: 'readonly', it: 'readonly' } },
  },
]);

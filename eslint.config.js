import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'build/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  { files: ['src/**/*.js'], languageOptions: { globals: globals.browser } },
  {
    files: [
      'scripts/**/*.mjs',
      '*.config.js',
      'tests/**/*.js',
      'src/**/*.test.js',
    ],
    languageOptions: { globals: globals.node },
  },
  // Playwright callbacks passed to evaluate() run in the browser.
  { files: ['tests/**/*.js'], languageOptions: { globals: globals.browser } },
];

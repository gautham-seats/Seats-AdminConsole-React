import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import jest from 'eslint-plugin-jest'

const browserObjects = ['window', 'globalThis', 'self']

const restrictedProperties = (names, message) =>
  browserObjects.flatMap(object => names.map(property => ({ object, property, message })))

const FETCH_MESSAGE = 'Use the shared API client in src/shared/api.'
const STORAGE_MESSAGE = 'Use the per-user storage helper in src/shared/storage.'

const fetchGlobals = [{ name: 'fetch', message: FETCH_MESSAGE }]
const storageGlobals = [
  { name: 'localStorage', message: STORAGE_MESSAGE },
  { name: 'sessionStorage', message: STORAGE_MESSAGE },
]

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts', 'docs/**']),
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-nocheck': true, 'ts-expect-error': 'allow-with-description' },
      ],
      'no-console': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-restricted-globals': ['error', ...fetchGlobals, ...storageGlobals],
      'no-restricted-properties': [
        'error',
        ...restrictedProperties(['fetch'], FETCH_MESSAGE),
        ...restrictedProperties(['localStorage', 'sessionStorage'], STORAGE_MESSAGE),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "TSAsExpression[expression.type='TSAsExpression'][expression.typeAnnotation.type='TSUnknownKeyword']",
          message: 'Double casting through unknown hides type errors.',
        },
      ],
      'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }],
      'react/no-danger': 'error',
      // the plugin itself is registered by eslint-config-next; only its rules are added here
      ...jsxA11y.flatConfigs.recommended.rules,
      // forwardRef anchors take their children from spread props, which the rule cannot see
      'jsx-a11y/anchor-has-content': 'off',
      // combobox options are driven by aria-activedescendant from the input, per the APG pattern
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/interactive-supports-focus': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      // focusing the first field of a dialog on open is the intended behaviour
      'jsx-a11y/no-autofocus': 'off',
      // Label is a generic wrapper; each caller supplies htmlFor
      'jsx-a11y/label-has-associated-control': 'off',
    },
  },
  {
    files: ['src/shared/api/**/*.ts'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-globals': ['error', ...storageGlobals],
      'no-restricted-properties': [
        'error',
        ...restrictedProperties(['localStorage', 'sessionStorage'], STORAGE_MESSAGE),
      ],
    },
  },
  {
    files: ['src/shared/storage/**/*.ts'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-globals': ['error', ...fetchGlobals],
      'no-restricted-properties': ['error', ...restrictedProperties(['fetch'], FETCH_MESSAGE)],
    },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}', 'jest.setup.ts'],
    plugins: { jest },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'react/jsx-no-literals': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
      // A test must assert something, must not be skipped, and must not hide its assertions behind a branch.
      'jest/expect-expect': 'error',
      'jest/no-disabled-tests': 'error',
      'jest/no-conditional-expect': 'error',
      'jest/no-focused-tests': 'error',
      'jest/valid-expect': 'error',
    },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
])

export default eslintConfig

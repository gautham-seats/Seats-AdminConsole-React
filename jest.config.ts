import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  transform: { '^.+\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] },
  moduleNameMapper: {
    '\.(png|jpe?g|gif|svg|webp)$': '<rootDir>/src/shared/testing/image-stub.ts',
    '\.css$': '<rootDir>/src/shared/testing/style-stub.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  // The whole suite on a busy laptop can push a screen test past the 5 s default.
  testTimeout: 20000,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/shared/testing/**',
    '!src/types/**',
  ],
  // A floor, never lowered; raised as coverage grows.
  coverageThreshold: { global: { statements: 65, branches: 55, functions: 55, lines: 65 } },
}

export default config

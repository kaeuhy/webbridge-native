/** @type {import('jest').Config} */
const path = require('path');
const pkgRoot = path.resolve(__dirname, '../../packages');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
  transformIgnorePatterns: [],
  modulePathIgnorePatterns: ['dist/'],
  moduleNameMapper: {
    '^@webbridge-native/core$': `${pkgRoot}/core/src`,
    '^@webbridge-native/cookies$': `${pkgRoot}/cookies/src`,
    '^@webbridge-native/headers$': `${pkgRoot}/headers/src`,
    '^@webbridge-native/mock$': `${pkgRoot}/mock/src`,
    '^@webbridge-native/cache$': `${pkgRoot}/cache/src`,
    '^@webbridge-native/redirect$': `${pkgRoot}/redirect/src`,
    '^@webbridge-native/devtools$': `${pkgRoot}/devtools/src`,
    '^@webbridge-native/cors$': `${pkgRoot}/cors/src`,
    '^@webbridge-native/sse$': `${pkgRoot}/sse/src`,
  },
  rootDir: '.',
};

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
  moduleNameMapper: {
    '^@webbridge-native/core$': '<rootDir>/../core/src',
    '^@webbridge-native/cookies$': '<rootDir>/../cookies/src',
    '^@webbridge-native/headers$': '<rootDir>/../headers/src',
    '^@webbridge-native/mock$': '<rootDir>/../mock/src',
    '^@webbridge-native/cache$': '<rootDir>/../cache/src',
    '^@webbridge-native/redirect$': '<rootDir>/../redirect/src',
    '^@webbridge-native/devtools$': '<rootDir>/../devtools/src',
    '^@webbridge-native/cors$': '<rootDir>/../cors/src',
    '^@webbridge-native/sse$': '<rootDir>/../sse/src',
  },
};

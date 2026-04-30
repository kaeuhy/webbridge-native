/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@webbridge-native/core$': '<rootDir>/../core/src',
    '^@webbridge-native/mock$': '<rootDir>/../mock/src',
    '^@webbridge-native/cookies$': '<rootDir>/../cookies/src',
    '^@webbridge-native/headers$': '<rootDir>/../headers/src',
  },
};

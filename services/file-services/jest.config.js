'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/config/**'],
};

'use strict';

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/swagger.js',
    '!src/seeds/**',
    '!src/server.js',
  ],
  coverageReporters: ['text', 'lcov'],
};

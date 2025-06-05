// Global test setup
import { jest } from '@jest/globals';

// Mock console methods to avoid noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
};

// Set up test environment
process.env.NODE_ENV = 'test';

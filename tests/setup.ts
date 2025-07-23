/**
 * Jest test setup configuration
 */
import '@testing-library/jest-dom';

// Mock Electron API for testing
global.electronAPI = {
  file: {
    select: jest.fn(),
    read: jest.fn(), 
    write: jest.fn(),
    process: jest.fn(),
    scanDirectory: jest.fn(),
    processBatch: jest.fn(),
    validateProducts: jest.fn(),
  },
  database: {
    products: {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bulkCreate: jest.fn(),
    },
    mappings: {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      verify: jest.fn(),
      getStats: jest.fn(),
    },
  },
  settings: {
    get: jest.fn(),
    set: jest.fn(),
    getAll: jest.fn(),
    reset: jest.fn(),
  },
  window: {
    minimize: jest.fn(),
    maximize: jest.fn(),
    close: jest.fn(),
  },
  app: {
    getVersion: jest.fn(),
    getPath: jest.fn(),
    restart: jest.fn(),
  },
};

// Mock window object
Object.defineProperty(window, 'electronAPI', {
  value: global.electronAPI,
  writable: true,
});

// Suppress console warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
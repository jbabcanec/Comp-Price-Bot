/* eslint-disable @typescript-eslint/no-explicit-any */
// Jest setup file
import '@testing-library/jest-dom';

// Mock electron APIs for testing
global.window = global.window || {};

// Mock the electron API
(global as any).window.electronAPI = {
  minimize: jest.fn(),
  maximize: jest.fn(),
  close: jest.fn(),
  selectFile: jest.fn(),
  readFile: jest.fn(),
  database: {
    query: jest.fn(),
    run: jest.fn(),
  },
  settings: {
    get: jest.fn(),
    set: jest.fn(),
  },
  onFileProcessed: jest.fn(),
  removeAllListeners: jest.fn(),
};

import '@testing-library/jest-dom'

// Mock window.keplr for testing
global.window = global.window || {};
global.window.keplr = {
  enable: jest.fn(),
  getKey: jest.fn(),
  signArbitrary: jest.fn(),
}

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}
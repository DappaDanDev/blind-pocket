import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'util'
import { ReadableStream } from 'stream/web'
import { MessageChannel } from 'worker_threads'

// Mock window.keplr for testing
global.window = global.window || {};
global.window.keplr = {
  enable: jest.fn(),
  getKey: jest.fn(),
  signArbitrary: jest.fn(),
}

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

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

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream
}

if (typeof global.MessageChannel === 'undefined') {
  const channel = new MessageChannel()
  global.MessageChannel = MessageChannel
  // @ts-expect-error assigning Node implementations for tests
  global.MessagePort = channel.port1.constructor
  channel.port1.close()
  channel.port2.close()

  if (typeof global.MessageEvent === 'undefined') {
    // Minimal shim used by undici during tests
    class ShimMessageEvent {}
    // @ts-expect-error shim assignment for test environment
    global.MessageEvent = ShimMessageEvent
  }
}

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}

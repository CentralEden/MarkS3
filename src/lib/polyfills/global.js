// Global polyfills for Node.js APIs in browser environment
// This file ensures that global objects are available before any other modules load

// Buffer polyfill - essential for AWS SDK
import { Buffer } from 'buffer';
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer;
  globalThis.global = globalThis;
}
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.global = window;
}

// Process polyfill - required for AWS SDK and other Node.js modules
import processPolyfill from 'process';
if (typeof globalThis !== 'undefined') {
  globalThis.process = processPolyfill;
}
if (typeof window !== 'undefined') {
  window.process = processPolyfill;
}

// Use the imported process for configuration
const process = processPolyfill;

// Ensure process.env exists with default values
if (!process.env) {
  process.env = {};
}

// Set browser-specific process properties
process.browser = true;
process.version = 'v18.0.0';
process.platform = 'browser';
process.arch = 'x64';
process.title = 'browser';

// Add process methods
process.cwd = () => '/';
process.chdir = () => {};
process.umask = () => 0;

// Add process.nextTick if not available
if (!process.nextTick) {
  process.nextTick = (fn, ...args) => {
    return Promise.resolve().then(() => fn(...args));
  };
}

// Additional global polyfills for compatibility
if (typeof globalThis !== 'undefined') {
  // Ensure global is available
  if (!globalThis.global) {
    globalThis.global = globalThis;
  }
  
  // Add setImmediate polyfill if not available
  if (!globalThis.setImmediate) {
    globalThis.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
  }
  
  // Add clearImmediate polyfill if not available
  if (!globalThis.clearImmediate) {
    globalThis.clearImmediate = (id) => clearTimeout(id);
  }
  
  // Ensure __dirname and __filename are available for compatibility
  if (!globalThis.__dirname) {
    globalThis.__dirname = '/';
  }
  
  if (!globalThis.__filename) {
    globalThis.__filename = '/index.js';
  }
  
  // Add module polyfill for compatibility
  if (!globalThis.module) {
    globalThis.module = {
      exports: {},
      require: () => {},
      id: '.',
      filename: '/index.js',
      loaded: false,
      parent: null,
      children: []
    };
  }
  
  // Add require polyfill (minimal implementation)
  if (!globalThis.require) {
    globalThis.require = (id) => {
      throw new Error(`Cannot require '${id}' in browser environment`);
    };
  }
}

// Export for module compatibility
export { Buffer, process };
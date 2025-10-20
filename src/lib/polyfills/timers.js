// Timer polyfills for Node.js compatibility in browser

// setImmediate polyfill
if (typeof globalThis !== 'undefined' && !globalThis.setImmediate) {
  globalThis.setImmediate = function(fn, ...args) {
    return setTimeout(fn, 0, ...args);
  };
}

if (typeof globalThis !== 'undefined' && !globalThis.clearImmediate) {
  globalThis.clearImmediate = function(id) {
    return clearTimeout(id);
  };
}

// process.nextTick polyfill
if (typeof globalThis !== 'undefined' && globalThis.process && !globalThis.process.nextTick) {
  globalThis.process.nextTick = function(fn, ...args) {
    return Promise.resolve().then(() => fn(...args));
  };
}

// Export for module compatibility
export const setImmediate = globalThis.setImmediate;
export const clearImmediate = globalThis.clearImmediate;
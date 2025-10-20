// Polyfill initialization for browser compatibility
// This module must be imported before any AWS SDK or Node.js modules

// Import global polyfills first
import './global.js';
import './timers.js';

// Additional polyfill imports to ensure they're bundled
import 'buffer';
import process from 'process';
import 'readable-stream';
import 'crypto-browserify';
import 'events';
import 'util';
import 'path-browserify';
import 'os-browserify/browser';
import 'url';
import 'querystring-es3';
import 'assert';
import 'vm-browserify';

// Ensure crypto polyfill is available globally
import crypto from 'crypto-browserify';
if (typeof globalThis !== 'undefined' && !globalThis.crypto?.subtle) {
  // Only add if native crypto is not available or incomplete
  if (!globalThis.crypto) {
    globalThis.crypto = crypto as any;
  }
}

// Stream polyfill for AWS SDK
import { Readable, Writable, Transform, PassThrough } from 'readable-stream';
if (typeof globalThis !== 'undefined') {
  if (!globalThis.ReadableStream || !globalThis.WritableStream) {
    // Add stream constructors for compatibility
    (globalThis as any).ReadableStream = (globalThis as any).ReadableStream || Readable;
    (globalThis as any).WritableStream = (globalThis as any).WritableStream || Writable;
    (globalThis as any).TransformStream = (globalThis as any).TransformStream || Transform;
  }
}

// Events polyfill
import { EventEmitter } from 'events';
if (typeof globalThis !== 'undefined') {
  (globalThis as any).EventEmitter = EventEmitter;
}

// Util polyfill
import util from 'util';
if (typeof globalThis !== 'undefined') {
  (globalThis as any).util = util;
}

// Path polyfill
import path from 'path-browserify';
if (typeof globalThis !== 'undefined') {
  (globalThis as any).path = path;
}

// OS polyfill
import os from 'os-browserify/browser';
if (typeof globalThis !== 'undefined') {
  (globalThis as any).os = os;
}

// URL polyfill
import { URL, URLSearchParams } from 'url';
if (typeof globalThis !== 'undefined') {
  if (!globalThis.URL) {
    (globalThis as any).URL = URL;
  }
  if (!globalThis.URLSearchParams) {
    (globalThis as any).URLSearchParams = URLSearchParams;
  }
}

// QueryString polyfill
import * as querystring from 'querystring-es3';
if (typeof globalThis !== 'undefined') {
  (globalThis as any).querystring = querystring;
}

// Assert polyfill
import assert from 'assert';
if (typeof globalThis !== 'undefined') {
  (globalThis as any).assert = assert;
}

// VM polyfill (minimal implementation for compatibility)
import vm from 'vm-browserify';
if (typeof globalThis !== 'undefined') {
  (globalThis as any).vm = vm;
}

console.log('✅ Comprehensive polyfills initialized successfully');

export {
  crypto,
  EventEmitter,
  util,
  path,
  os,
  URL,
  URLSearchParams,
  querystring,
  Readable,
  Writable,
  Transform,
  PassThrough,
  assert,
  vm
};
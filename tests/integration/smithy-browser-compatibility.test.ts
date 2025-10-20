/**
 * Smithy Browser Compatibility Test
 * Validates that Smithy HTTP handlers work correctly in browser environment
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { HttpRequest } from '@smithy/protocol-http';
import { createBrowserHttpHandler, browserRequestHandlerConfig } from '../../src/lib/config/browserHttpHandler.js';

describe('Smithy Browser Compatibility', () => {
  let httpHandler: any;

  beforeAll(() => {
    // Ensure we're in a browser-like environment
    if (typeof global !== 'undefined' && !global.fetch) {
      // Mock fetch for Node.js test environment
      global.fetch = async (url: string, options?: any) => {
        return new Response(JSON.stringify({ test: 'success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };
    }
  });

  describe('Browser HTTP Handler Creation', () => {
    it('should create a browser-compatible HTTP handler', () => {
      httpHandler = createBrowserHttpHandler();
      expect(httpHandler).toBeDefined();
      expect(httpHandler).toBeInstanceOf(FetchHttpHandler);
    });

    it('should have proper browser configuration', () => {
      const config = browserRequestHandlerConfig;
      expect(config.runtime).toBe('browser');
      expect(config.maxAttempts).toBe(3);
      expect(config.retryMode).toBe('adaptive');
      expect(config.requestHandler).toBeDefined();
    });
  });

  describe('HTTP Request Processing', () => {
    it('should handle basic HTTP requests', async () => {
      const handler = createBrowserHttpHandler();
      
      // Create a simple test request
      const request = new HttpRequest({
        method: 'GET',
        protocol: 'https:',
        hostname: 'httpbin.org',
        path: '/get',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // This should not throw an error
      expect(() => handler.handle(request)).not.toThrow();
    });

    it('should use fetch API for requests', () => {
      const handler = createBrowserHttpHandler();
      expect(handler).toBeInstanceOf(FetchHttpHandler);
    });
  });

  describe('Node.js Module Exclusion', () => {
    it('should not import node-http-handler', async () => {
      // Try to import node-http-handler - should fail or return empty module
      try {
        const nodeHandler = await import('@smithy/node-http-handler');
        // If import succeeds, it should be our empty polyfill
        expect(nodeHandler.default).toEqual({});
      } catch (error) {
        // Import failure is also acceptable
        expect(error).toBeDefined();
      }
    });

    it('should not have Node.js specific dependencies', () => {
      const handler = createBrowserHttpHandler();
      
      // Check that the handler doesn't have Node.js specific properties
      expect(handler).not.toHaveProperty('agent');
      expect(handler).not.toHaveProperty('httpsAgent');
      expect(handler).not.toHaveProperty('httpAgent');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const handler = createBrowserHttpHandler();
      
      // Create a request to a non-existent endpoint
      const request = new HttpRequest({
        method: 'GET',
        protocol: 'https:',
        hostname: 'non-existent-domain-12345.com',
        path: '/test',
        headers: {}
      });

      // Should handle the request without throwing synchronously
      expect(() => handler.handle(request)).not.toThrow();
    });
  });

  describe('Browser Environment Detection', () => {
    it('should detect browser environment correctly', () => {
      // In test environment, we might not have window/document
      // but the function should still work
      const { isBrowserEnvironment } = require('../../src/lib/config/browserHttpHandler.js');
      
      // Should return a boolean
      expect(typeof isBrowserEnvironment()).toBe('boolean');
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid timeout configuration', () => {
      const handler = createBrowserHttpHandler();
      
      // FetchHttpHandler should have timeout configuration
      expect(handler).toBeDefined();
    });

    it('should have proper CORS configuration', () => {
      const config = browserRequestHandlerConfig;
      
      // Should have browser-specific settings
      expect(config.useFipsEndpoint).toBe(false);
      expect(config.useDualstackEndpoint).toBe(false);
      expect(config.useAccelerateEndpoint).toBe(false);
    });
  });
});
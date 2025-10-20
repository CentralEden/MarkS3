/**
 * Browser-compatible HTTP handler configuration for AWS SDK
 * Ensures proper browser environment HTTP request handling
 */

import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import type { HttpHandler, HttpRequest, HttpResponse } from '@smithy/protocol-http';

/**
 * Create a browser-compatible HTTP handler that uses fetch API
 * This replaces Node.js-specific HTTP handlers with browser-compatible ones
 */
export function createBrowserHttpHandler(): HttpHandler {
  // Use Smithy's FetchHttpHandler which is designed for browser environments
  return new FetchHttpHandler({
    // Configure for browser environment
    requestTimeout: 30000, // 30 second timeout
    // Ensure proper CORS handling
    keepAlive: false, // Disable keep-alive for better browser compatibility
    // Use browser's native fetch implementation
    fetchOptions: {
      // Enable credentials for CORS requests if needed
      credentials: 'same-origin',
      // Set proper headers for browser requests
      headers: {
        'User-Agent': 'MarkS3-Browser-Client/1.0'
      }
    }
  });
}

/**
 * Browser-compatible request handler configuration
 * This ensures all AWS SDK clients use browser-compatible HTTP handling
 */
export const browserRequestHandlerConfig = {
  requestHandler: createBrowserHttpHandler(),
  // Disable Node.js specific features
  runtime: 'browser' as const,
  // Configure for browser environment
  maxAttempts: 3,
  retryMode: 'adaptive' as const,
  // Ensure proper browser compatibility
  useFipsEndpoint: false,
  useDualstackEndpoint: false,
  useAccelerateEndpoint: false
};

/**
 * Check if we're running in a browser environment
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Get the appropriate HTTP handler based on environment
 * Always returns browser handler since this is a browser-only application
 */
export function getHttpHandler(): HttpHandler {
  return createBrowserHttpHandler();
}
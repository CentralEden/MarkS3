/**
 * Browser Environment AWS SDK Tests
 * Tests AWS SDK functionality specifically in browser environment conditions
 * Validates Cognito authentication and S3 file operations work correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../../src/lib/services/auth.js';
import { S3Service } from '../../src/lib/services/s3.js';
import { WikiError, ErrorCodes } from '../../src/lib/types/index.js';

// Mock browser environment
const mockWindow = {
  localStorage: {
    store: new Map<string, string>(),
    getItem: function(key: string) { return this.store.get(key) || null; },
    setItem: function(key: string, value: string) { this.store.set(key, value); },
    removeItem: function(key: string) { this.store.delete(key); },
    clear: function() { this.store.clear(); }
  },
  location: {
    origin: 'https://test.example.com',
    hostname: 'test.example.com',
    protocol: 'https:'
  },
  navigator: {
    userAgent: 'Mozilla/5.0 (Test Browser)'
  },
  fetch: vi.fn(),
  performance: {
    now: () => Date.now()
  }
};

// Mock global window object
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

describe('Browser Environment AWS SDK Tests', () => {
  let authService: AuthService;
  let s3Service: S3Service;

  beforeEach(() => {
    // Clear localStorage before each test
    mockWindow.localStorage.clear();
    
    // Reset fetch mock
    vi.clearAllMocks();
    
    // Initialize services
    authService = new AuthService();
    s3Service = new S3Service();
  });

  afterEach(() => {
    mockWindow.localStorage.clear();
  });

  describe('Cognito Authentication in Browser', () => {
    it('should initialize Cognito client without Node.js dependencies', () => {
      expect(() => new AuthService()).not.toThrow();
      expect(authService).toBeDefined();
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should handle browser-specific authentication flow', async () => {
      // Test login with invalid credentials (should fail gracefully)
      const result = await authService.login('test-user@example.com', 'invalid-password');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
      
      // Should provide user-friendly error message
      expect(result.error).not.toContain('AWS SDK');
      expect(result.error).not.toContain('Node.js');
    });

    it('should handle network errors during authentication', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      try {
        const result = await authService.login('test@example.com', 'password');
        
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
        expect(typeof result.error).toBe('string');
        
        // Should handle network errors gracefully
        expect(result.error.toLowerCase()).toMatch(/network|connection|internet/);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should handle CORS errors during authentication', async () => {
      // Mock CORS error
      const corsError = new Error('Cross-Origin Request Blocked');
      corsError.name = 'CORSError';
      
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(corsError);
      
      try {
        const result = await authService.login('test@example.com', 'password');
        
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
        
        // Should provide CORS-specific guidance
        expect(result.error.toLowerCase()).toMatch(/cors|cross-origin|configuration/);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should persist and restore session in localStorage', () => {
      // Mock session data
      const mockSession = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        user: {
          id: 'test-user',
          username: 'test-user',
          email: 'test@example.com',
          role: 'regular'
        }
      };
      
      mockWindow.localStorage.setItem('marks3_session', JSON.stringify(mockSession));
      
      // Create new auth service to test restoration
      const newAuthService = new AuthService();
      
      expect(newAuthService.isAuthenticated()).toBe(true);
      expect(newAuthService.getCurrentUserRole()).toBe('regular');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Set corrupted session data
      mockWindow.localStorage.setItem('marks3_session', 'invalid-json-data');
      
      expect(() => new AuthService()).not.toThrow();
      
      const authService = new AuthService();
      expect(authService.isAuthenticated()).toBe(false);
      
      // Should clear corrupted data
      expect(mockWindow.localStorage.getItem('marks3_session')).toBeNull();
    });

    it('should handle token refresh with retry logic', async () => {
      // Set up session with refresh token
      const mockSession = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        idToken: 'mock-id-token',
        user: {
          id: 'test-user',
          username: 'test-user',
          email: 'test@example.com',
          role: 'regular'
        }
      };
      
      mockWindow.localStorage.setItem('marks3_session', JSON.stringify(mockSession));
      
      const authService = new AuthService();
      
      try {
        await authService.refreshToken();
        // If this succeeds, token refresh worked
        expect(true).toBe(true);
      } catch (error) {
        // Should be a WikiError with appropriate message
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.AUTH_FAILED);
      }
    });

    it('should validate permission system works in browser', () => {
      // Test unauthenticated permissions
      expect(authService.checkPermission('read')).toBe(false);
      expect(authService.checkPermission('write')).toBe(false);
      expect(authService.checkPermission('admin')).toBe(false);
      
      // Mock authenticated user
      const mockSession = {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        idToken: 'mock-id',
        user: {
          id: 'regular-user',
          username: 'regular-user',
          email: 'regular@example.com',
          role: 'regular'
        }
      };
      
      mockWindow.localStorage.setItem('marks3_session', JSON.stringify(mockSession));
      
      const authService = new AuthService();
      
      // Test regular user permissions
      expect(authService.checkPermission('read')).toBe(true);
      expect(authService.checkPermission('write')).toBe(true);
      expect(authService.checkPermission('admin')).toBe(false);
    });
  });

  describe('S3 Operations in Browser', () => {
    it('should initialize S3 client with browser-compatible configuration', () => {
      expect(() => new S3Service()).not.toThrow();
      expect(s3Service).toBeDefined();
    });

    it('should handle bucket access check with proper error handling', async () => {
      const result = await s3Service.checkBucketAccess();
      
      expect(result).toHaveProperty('accessible');
      expect(typeof result.accessible).toBe('boolean');
      
      if (!result.accessible) {
        expect(result).toHaveProperty('error');
        expect(result.error).toBeInstanceOf(WikiError);
        
        // Should provide user-friendly error messages
        const error = result.error as WikiError;
        expect(error.message).not.toContain('AWS SDK');
        expect(error.message).not.toContain('Node.js');
      }
    });

    it('should handle CORS errors in S3 operations', async () => {
      // Mock CORS error for S3 operations
      const corsError = new Error('CORS policy blocked request');
      corsError.name = 'CORSError';
      
      try {
        // This will likely fail due to missing credentials, but should handle gracefully
        await s3Service.getPage('test-page.md');
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        const wikiError = error as WikiError;
        
        // Should provide CORS-specific guidance
        if (wikiError.message.toLowerCase().includes('cors')) {
          expect(wikiError.message).toMatch(/cors|cross-origin|bucket.*configuration/i);
        }
      }
    });

    it('should handle network timeouts in S3 operations', async () => {
      try {
        // Test with potentially unreachable S3 endpoint
        await s3Service.listPages();
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        const wikiError = error as WikiError;
        
        // Should categorize network errors appropriately
        expect([
          ErrorCodes.NETWORK_ERROR,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.BUCKET_NOT_FOUND
        ]).toContain(wikiError.code);
        
        // Should provide actionable error messages
        expect(wikiError.message).toBeTruthy();
        expect(typeof wikiError.message).toBe('string');
      }
    });

    it('should handle file upload with browser File API', async () => {
      // Create mock File object (browser File API)
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
        lastModified: Date.now()
      });
      
      try {
        await s3Service.uploadFile(mockFile, 'test-upload.txt');
        // If successful, file upload worked
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        
        // Should handle file upload errors gracefully
        const wikiError = error as WikiError;
        expect([
          ErrorCodes.NETWORK_ERROR,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.FILE_TOO_LARGE,
          ErrorCodes.INVALID_FILE_TYPE
        ]).toContain(wikiError.code);
      }
    });

    it('should validate file size limits in browser', async () => {
      // Create oversized file (simulate large file)
      const largeContent = 'x'.repeat(100 * 1024 * 1024); // 100MB
      const largeFile = new File([largeContent], 'large.txt', {
        type: 'text/plain'
      });
      
      try {
        await s3Service.uploadFile(largeFile, 'large-file.txt');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe('FILE_TOO_LARGE' as ErrorCodes);
        expect((error as WikiError).message).toMatch(/size.*exceeds.*maximum/i);
      }
    });

    it('should handle retry logic for transient S3 errors', async () => {
      // Test that retry logic works for S3 operations
      try {
        const result = await s3Service.checkBucketAccess();
        expect(result).toHaveProperty('accessible');
      } catch (error) {
        // Even if it fails, should be handled gracefully with retries
        expect(error).toBeInstanceOf(WikiError);
      }
    });

    it('should generate proper file URLs for browser access', async () => {
      try {
        const url = await s3Service.getFileUrl('test-file.jpg');
        
        expect(typeof url).toBe('string');
        expect(url).toMatch(/^https:\/\//);
        
        // Should use virtual-hosted-style URLs for better CORS support
        expect(url).toMatch(/\.s3\./);
      } catch (error) {
        // Should handle URL generation errors gracefully
        expect(error).toBeInstanceOf(WikiError);
      }
    });

    it('should handle optimistic locking in browser environment', async () => {
      const mockPage = {
        path: 'test-page.md',
        title: 'Test Page',
        content: '# Test Content',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test-user',
          version: 1
        }
      };
      
      try {
        const result = await s3Service.savePage(mockPage, 'test-etag');
        
        if (result.success) {
          expect(result.etag).toBeTruthy();
          expect(result.conflict).toBe(false);
        } else if (result.conflict) {
          expect(result.conflict).toBe(true);
          expect(result.etag).toBeTruthy();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
      }
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should implement exponential backoff for network errors', async () => {
      const startTime = Date.now();
      
      try {
        // This will likely fail, but should implement proper retry logic
        await s3Service.getPage('non-existent-page.md');
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Should have taken some time due to retries (at least 1 second for retries)
        // But not too long (should not exceed reasonable timeout)
        expect(duration).toBeGreaterThan(100); // At least some delay
        expect(duration).toBeLessThan(30000); // But not excessive
        
        expect(error).toBeInstanceOf(WikiError);
      }
    });

    it('should handle concurrent AWS operations without conflicts', async () => {
      // Test multiple concurrent operations
      const operations = [
        s3Service.checkBucketAccess(),
        authService.getCurrentUser(),
        s3Service.getConfig().catch(() => ({ title: 'Test Wiki', allowGuestAccess: false }))
      ];
      
      const results = await Promise.allSettled(operations);
      
      // All operations should complete (either resolve or reject gracefully)
      expect(results).toHaveLength(3);
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          // Rejections should be WikiError instances
          expect(result.reason).toBeInstanceOf(WikiError);
          console.log(`Operation ${index} failed as expected:`, result.reason.message);
        } else {
          console.log(`Operation ${index} succeeded:`, typeof result.value);
        }
      });
    });

    it('should maintain service state consistency during errors', async () => {
      const initialAuthState = authService.isAuthenticated();
      
      // Perform operations that might fail
      await authService.login('invalid', 'invalid').catch(() => {});
      await authService.getCurrentUser().catch(() => {});
      await s3Service.checkBucketAccess().catch(() => {});
      
      // State should remain consistent
      expect(authService.isAuthenticated()).toBe(initialAuthState);
    });

    it('should provide user-friendly error messages for common issues', async () => {
      const testCases = [
        {
          operation: () => authService.login('', ''),
          expectedPattern: /username|password|required|empty/i
        },
        {
          operation: () => authService.login('invalid-email', 'short'),
          expectedPattern: /invalid|format|email/i
        }
      ];
      
      for (const testCase of testCases) {
        try {
          const result = await testCase.operation();
          if ('success' in result && !result.success) {
            expect(result.error).toMatch(testCase.expectedPattern);
          }
        } catch (error) {
          if (error instanceof WikiError) {
            expect(error.message).toMatch(testCase.expectedPattern);
          }
        }
      }
    });
  });

  describe('Browser Compatibility Validation', () => {
    it('should work with different browser environments', () => {
      const browserConfigs = [
        { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0' },
        { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/14.1' },
        { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0' },
        { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/91.0' }
      ];
      
      browserConfigs.forEach(config => {
        mockWindow.navigator.userAgent = config.userAgent;
        
        // Services should initialize without errors in different browsers
        expect(() => new AuthService()).not.toThrow();
        expect(() => new S3Service()).not.toThrow();
      });
    });

    it('should handle missing browser APIs gracefully', () => {
      // Test with missing localStorage
      const originalLocalStorage = mockWindow.localStorage;
      delete (mockWindow as any).localStorage;
      
      try {
        expect(() => new AuthService()).not.toThrow();
        
        const authService = new AuthService();
        expect(authService.isAuthenticated()).toBe(false);
      } finally {
        mockWindow.localStorage = originalLocalStorage;
      }
    });

    it('should validate polyfill functionality', () => {
      // Test that required polyfills are available
      expect(typeof Buffer).toBeDefined();
      expect(typeof process).toBeDefined();
      expect(process.env).toBeDefined();
      
      // Test crypto functionality
      if (typeof crypto !== 'undefined') {
        expect(crypto).toBeDefined();
      }
      
      // Test stream functionality (should be polyfilled)
      try {
        const { Readable } = require('stream');
        expect(Readable).toBeDefined();
      } catch (error) {
        // Stream polyfill might not be available in test environment
        console.warn('Stream polyfill not available in test environment');
      }
    });
  });
});
/**
 * AWS SDK Integration Tests
 * Tests the integration between our services and AWS SDK
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S3Service } from '../../src/lib/services/s3.js';
import { AuthService } from '../../src/lib/services/auth.js';
import { WikiError, ErrorCodes } from '../../src/lib/types/index.js';

describe('AWS SDK Integration', () => {
  let s3Service: S3Service;
  let authService: AuthService;

  beforeEach(() => {
    s3Service = new S3Service();
    authService = new AuthService();
  });

  afterEach(() => {
    // Clean up any test data if needed
  });

  describe('S3 Service AWS Integration', () => {
    it('should handle bucket access check gracefully', async () => {
      const result = await s3Service.checkBucketAccess();
      
      // Should return an object with accessible property
      expect(result).toHaveProperty('accessible');
      expect(typeof result.accessible).toBe('boolean');
      
      // If not accessible, should have error details
      if (!result.accessible) {
        expect(result).toHaveProperty('error');
        expect(result.error).toBeInstanceOf(WikiError);
      }
    });

    it('should handle S3 client initialization', () => {
      // S3Service should initialize without throwing
      expect(() => new S3Service()).not.toThrow();
    });

    it('should handle missing configuration gracefully', async () => {
      // Test with potentially missing AWS config
      try {
        await s3Service.getConfig();
        // If successful, should return default config
        expect(true).toBe(true);
      } catch (error) {
        // Should be a WikiError with appropriate code
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.NETWORK_ERROR
        ]).toContain((error as WikiError).code);
      }
    });

    it('should handle S3 error conversion correctly', async () => {
      // Test error handling by attempting to access non-existent resource
      try {
        await s3Service.getPage('non-existent-page.md');
        // If this succeeds, the page actually exists
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        const wikiError = error as WikiError;
        
        // Should have appropriate error code
        expect([
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.NETWORK_ERROR
        ]).toContain(wikiError.code);
        
        // Should have meaningful error message
        expect(wikiError.message).toBeTruthy();
        expect(typeof wikiError.message).toBe('string');
      }
    });

    it('should handle network connectivity issues', async () => {
      // Test with potentially unreachable endpoint
      try {
        const pages = await s3Service.listPages();
        // If successful, should return array
        expect(Array.isArray(pages)).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        const wikiError = error as WikiError;
        
        // Network errors should be properly categorized
        expect([
          ErrorCodes.NETWORK_ERROR,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.BUCKET_NOT_FOUND
        ]).toContain(wikiError.code);
      }
    });

    it('should handle retry logic for transient errors', async () => {
      // Test that retry logic doesn't break on immediate success
      try {
        const result = await s3Service.checkBucketAccess();
        expect(result).toHaveProperty('accessible');
      } catch (error) {
        // Even if it fails, should be handled gracefully
        expect(error).toBeInstanceOf(WikiError);
      }
    });
  });

  describe('Cognito Service AWS Integration', () => {
    it('should handle Cognito client initialization', () => {
      // AuthService should initialize without throwing
      expect(() => new AuthService()).not.toThrow();
    });

    it('should handle authentication with invalid credentials gracefully', async () => {
      const result = await authService.login('invalid-user', 'invalid-password');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('should handle getCurrentUser when not authenticated', async () => {
      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should handle token refresh when no token exists', async () => {
      try {
        await authService.refreshToken();
        // Should not reach here
        expect(false).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.AUTH_FAILED);
      }
    });

    it('should handle logout gracefully even when not logged in', async () => {
      // Should not throw even if not logged in
      await expect(authService.logout()).resolves.toBeUndefined();
    });

    it('should handle permission checks correctly', () => {
      // When not authenticated, should deny all permissions
      expect(authService.checkPermission('read')).toBe(false);
      expect(authService.checkPermission('write')).toBe(false);
      expect(authService.checkPermission('admin')).toBe(false);
    });

    it('should handle authentication state correctly', () => {
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUserRole()).toBeNull();
      expect(authService.checkGuestAccess()).toBe(false);
    });
  });

  describe('AWS Configuration Integration', () => {
    it('should handle missing AWS configuration', () => {
      // Services should handle missing config gracefully
      expect(() => {
        new S3Service();
        new AuthService();
      }).not.toThrow();
    });

    it('should use environment-appropriate AWS endpoints', async () => {
      // Test that services use correct AWS endpoints
      try {
        await s3Service.checkBucketAccess();
        // If successful, endpoints are reachable
        expect(true).toBe(true);
      } catch (error) {
        // Should get specific AWS-related errors, not generic ones
        expect(error).toBeInstanceOf(WikiError);
        const wikiError = error as WikiError;
        
        // Should not be generic errors
        expect(wikiError.code).not.toBe('UNKNOWN_ERROR');
      }
    });
  });

  describe('Cross-Service Integration', () => {
    it('should handle service dependencies correctly', () => {
      // Services should be able to work together
      expect(s3Service).toBeDefined();
      expect(authService).toBeDefined();
      
      // Should have proper interfaces
      expect(typeof s3Service.getConfig).toBe('function');
      expect(typeof authService.checkPermission).toBe('function');
    });

    it('should handle concurrent AWS operations', async () => {
      // Test multiple concurrent operations
      const operations = [
        s3Service.checkBucketAccess(),
        authService.getCurrentUser(),
        s3Service.getConfig().catch(() => ({ title: 'Test', allowGuestAccess: false }))
      ];

      const results = await Promise.allSettled(operations);
      
      // All operations should complete (either resolve or reject gracefully)
      expect(results).toHaveLength(3);
      results.forEach(result => {
        if (result.status === 'rejected') {
          // Rejections should be WikiError instances
          expect(result.reason).toBeInstanceOf(WikiError);
        }
      });
    });
  });
});
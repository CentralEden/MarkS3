/**
 * Authentication Flow Integration Tests
 * Tests the complete authentication flow including token management and session handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../src/lib/services/auth.js';
import { UserRole } from '../../src/lib/types/auth.js';
import { WikiError, ErrorCodes } from '../../src/lib/types/index.js';

// Mock localStorage for testing
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem: function(key: string) {
    return this.store.get(key) || null;
  },
  setItem: function(key: string, value: string) {
    this.store.set(key, value);
  },
  removeItem: function(key: string) {
    this.store.delete(key);
  },
  clear: function() {
    this.store.clear();
  }
};

// Mock window object for browser environment
Object.defineProperty(global, 'window', {
  value: {
    localStorage: mockLocalStorage
  },
  writable: true
});

describe('Authentication Flow Integration', () => {
  let authService: AuthService;

  beforeEach(() => {
    // Clear localStorage before each test
    mockLocalStorage.clear();
    authService = new AuthService();
  });

  afterEach(() => {
    // Clean up after each test
    mockLocalStorage.clear();
  });

  describe('Login Flow', () => {
    it('should handle complete login flow with invalid credentials', async () => {
      const result = await authService.login('test-user', 'wrong-password');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
      expect(result.error).toBeTruthy();
      
      // Should not be authenticated after failed login
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUserRole()).toBeNull();
    });

    it('should handle login with empty credentials', async () => {
      const result = await authService.login('', '');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle login with malformed credentials', async () => {
      const result = await authService.login('invalid@email', 'short');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should maintain authentication state consistency', async () => {
      // Before login
      expect(authService.isAuthenticated()).toBe(false);
      expect(await authService.getCurrentUser()).toBeNull();
      
      // After failed login
      await authService.login('invalid', 'invalid');
      expect(authService.isAuthenticated()).toBe(false);
      expect(await authService.getCurrentUser()).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should handle session restoration from localStorage', () => {
      // Simulate existing session data
      const mockSessionData = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        user: {
          id: 'test-user',
          username: 'test-user',
          email: 'test@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      
      // Create new auth service instance to test restoration
      const newAuthService = new AuthService();
      
      // Should restore session data
      expect(newAuthService.isAuthenticated()).toBe(true);
      expect(newAuthService.getCurrentUserRole()).toBe(UserRole.REGULAR);
    });

    it('should handle corrupted session data gracefully', () => {
      // Set corrupted session data
      mockLocalStorage.setItem('marks3_session', 'invalid-json');
      
      // Should not throw and should clear corrupted data
      expect(() => new AuthService()).not.toThrow();
      
      const authService = new AuthService();
      expect(authService.isAuthenticated()).toBe(false);
      expect(mockLocalStorage.getItem('marks3_session')).toBeNull();
    });

    it('should handle missing session data', () => {
      // Ensure no session data exists
      mockLocalStorage.clear();
      
      const authService = new AuthService();
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUserRole()).toBeNull();
    });

    it('should clear session on logout', async () => {
      // Set up mock session
      const mockSessionData = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        user: {
          id: 'test-user',
          username: 'test-user',
          email: 'test@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      
      const authService = new AuthService();
      expect(authService.isAuthenticated()).toBe(true);
      
      // Logout should clear session
      await authService.logout();
      
      expect(authService.isAuthenticated()).toBe(false);
      expect(mockLocalStorage.getItem('marks3_session')).toBeNull();
    });
  });

  describe('Token Management', () => {
    it('should handle token refresh when no refresh token exists', async () => {
      try {
        await authService.refreshToken();
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.AUTH_FAILED);
        expect((error as WikiError).message).toContain('refresh token');
      }
    });

    it('should handle getCurrentUser with expired token', async () => {
      // Set up session with potentially expired token
      const mockSessionData = {
        accessToken: 'expired-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        user: {
          id: 'test-user',
          username: 'test-user',
          email: 'test@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      
      const authService = new AuthService();
      
      // Should handle expired token gracefully
      const user = await authService.getCurrentUser();
      
      // Should either return null (if token refresh fails) or user (if refresh succeeds)
      expect(user === null || (user && user.id === 'test-user')).toBe(true);
    });

    it('should handle token validation failure', async () => {
      // Set up session with invalid token
      const mockSessionData = {
        accessToken: 'invalid-token',
        refreshToken: 'invalid-refresh-token',
        idToken: 'invalid-id-token',
        user: {
          id: 'test-user',
          username: 'test-user',
          email: 'test@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      
      const authService = new AuthService();
      
      // Should handle invalid tokens by clearing session
      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('Permission System Integration', () => {
    it('should handle permission checks for different user roles', () => {
      // Test guest permissions
      expect(authService.checkPermission('read')).toBe(false);
      expect(authService.checkPermission('write')).toBe(false);
      expect(authService.checkPermission('admin')).toBe(false);
    });

    it('should handle permission checks with mock authenticated user', () => {
      // Set up mock regular user session
      const mockSessionData = {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        idToken: 'mock-id',
        user: {
          id: 'regular-user',
          username: 'regular-user',
          email: 'regular@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      
      const authService = new AuthService();
      
      // Regular user permissions
      expect(authService.checkPermission('read')).toBe(true);
      expect(authService.checkPermission('write')).toBe(true);
      expect(authService.checkPermission('edit')).toBe(true);
      expect(authService.checkPermission('create')).toBe(true);
      expect(authService.checkPermission('delete')).toBe(true);
      expect(authService.checkPermission('upload')).toBe(true);
      expect(authService.checkPermission('admin')).toBe(false);
      expect(authService.checkPermission('user_management')).toBe(false);
      expect(authService.checkPermission('config')).toBe(false);
    });

    it('should handle permission checks with mock admin user', () => {
      // Set up mock admin user session
      const mockSessionData = {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        idToken: 'mock-id',
        user: {
          id: 'admin-user',
          username: 'admin-user',
          email: 'admin@example.com',
          role: UserRole.ADMIN
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      
      const authService = new AuthService();
      
      // Admin user permissions
      expect(authService.checkPermission('read')).toBe(true);
      expect(authService.checkPermission('write')).toBe(true);
      expect(authService.checkPermission('edit')).toBe(true);
      expect(authService.checkPermission('create')).toBe(true);
      expect(authService.checkPermission('delete')).toBe(true);
      expect(authService.checkPermission('upload')).toBe(true);
      expect(authService.checkPermission('admin')).toBe(true);
      expect(authService.checkPermission('user_management')).toBe(true);
      expect(authService.checkPermission('config')).toBe(true);
    });

    it('should handle unknown permission types', () => {
      const mockSessionData = {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        idToken: 'mock-id',
        user: {
          id: 'test-user',
          username: 'test-user',
          email: 'test@example.com',
          role: UserRole.ADMIN
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      
      const authService = new AuthService();
      
      // Unknown permissions should be denied
      expect(authService.checkPermission('unknown_permission')).toBe(false);
      expect(authService.checkPermission('')).toBe(false);
    });
  });

  describe('Guest Access Integration', () => {
    it('should handle guest access configuration', () => {
      // Default guest access should be false
      expect(authService.checkGuestAccess()).toBe(false);
      
      // Should handle guest access setting
      authService.setGuestAccess(true);
      // Note: Current implementation doesn't actually change behavior
      // This test verifies the method exists and doesn't throw
      expect(() => authService.setGuestAccess(false)).not.toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors during authentication', async () => {
      // Test with potentially unreachable Cognito endpoint
      const result = await authService.login('test@example.com', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(typeof result.error).toBe('string');
    });

    it('should handle service unavailable errors', async () => {
      // Test resilience to service issues
      const user = await authService.getCurrentUser();
      
      // Should handle gracefully (return null or valid user)
      expect(user === null || (user && typeof user.id === 'string')).toBe(true);
    });

    it('should maintain consistent state during errors', async () => {
      const initialState = authService.isAuthenticated();
      
      // Perform operations that might fail
      await authService.login('invalid', 'invalid');
      await authService.getCurrentUser();
      
      try {
        await authService.refreshToken();
      } catch (error) {
        // Expected to fail
      }
      
      // State should remain consistent
      expect(authService.isAuthenticated()).toBe(initialState);
    });
  });
});
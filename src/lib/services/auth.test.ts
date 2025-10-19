/**
 * Authentication Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.js';
import { UserRole } from '../types/auth.js';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('checkPermission', () => {
    it('should deny all permissions when user is not authenticated', () => {
      expect(authService.checkPermission('read')).toBe(false);
      expect(authService.checkPermission('write')).toBe(false);
      expect(authService.checkPermission('admin')).toBe(false);
    });

    it('should check guest access correctly', () => {
      expect(authService.checkGuestAccess()).toBe(false);
    });

    it('should return correct authentication status', () => {
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUserRole()).toBe(null);
    });
  });

  describe('UserRole enum', () => {
    it('should have correct role values', () => {
      expect(UserRole.GUEST).toBe('guest');
      expect(UserRole.REGULAR).toBe('regular');
      expect(UserRole.ADMIN).toBe('admin');
    });
  });
});
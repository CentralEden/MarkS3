/**
 * Application Initialization Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appInitializationService, type InitializationStatus } from './appInitialization.js';
import { WikiError, ErrorCodes } from '../types/errors.js';

// Mock the dependencies
vi.mock('../stores/auth.js', () => ({
  authStore: {
    init: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn().mockResolvedValue('token')
  }
}));

vi.mock('./s3.js', () => ({
  s3Service: {
    getConfig: vi.fn(),
    saveConfig: vi.fn()
  }
}));

vi.mock('./wiki.js', () => ({
  wikiService: {
    getPageHierarchy: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('./files.js', () => ({
  fileService: {
    listFiles: vi.fn().mockResolvedValue([])
  }
}));

describe('AppInitializationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appInitializationService.reset();
  });

  describe('initialize', () => {
    it('should initialize successfully with default config', async () => {
      const { s3Service } = await import('./s3.js');
      
      // Mock successful config loading
      vi.mocked(s3Service.getConfig).mockResolvedValue({
        title: 'Test Wiki',
        description: 'Test Description',
        allowGuestAccess: false,
        theme: 'default',
        features: {
          fileUpload: true,
          userManagement: true,
          search: true,
          pageHistory: false
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024,
          maxPages: 1000,
          maxFilesPerPage: 20
        }
      });

      const result = await appInitializationService.initialize();

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.title).toBe('Test Wiki');
      expect(appInitializationService.isInitialized()).toBe(true);
    });

    it('should handle config loading failure gracefully', async () => {
      const { s3Service } = await import('./s3.js');
      
      // Mock config loading failure first, then success for saveConfig
      vi.mocked(s3Service.getConfig)
        .mockRejectedValueOnce(new WikiError(ErrorCodes.FILE_NOT_FOUND, 'Config not found'))
        .mockResolvedValue({
          title: 'MarkS3 Wiki',
          description: 'A serverless markdown wiki system',
          allowGuestAccess: false,
          theme: 'default',
          features: {
            fileUpload: true,
            userManagement: true,
            search: true,
            pageHistory: false
          },
          limits: {
            maxFileSize: 10 * 1024 * 1024,
            maxPages: 1000,
            maxFilesPerPage: 20
          }
        });
      vi.mocked(s3Service.saveConfig).mockResolvedValue();

      const result = await appInitializationService.initialize();

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.[0]).toContain('Configuration could not be loaded, using default settings');
      expect(s3Service.saveConfig).toHaveBeenCalled();
    });

    it('should track initialization status updates', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue({
        title: 'Test Wiki',
        description: 'Test Description',
        allowGuestAccess: false,
        theme: 'default',
        features: {
          fileUpload: true,
          userManagement: true,
          search: true,
          pageHistory: false
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024,
          maxPages: 1000,
          maxFilesPerPage: 20
        }
      });

      const statusUpdates: InitializationStatus[] = [];
      const unsubscribe = appInitializationService.onStatusUpdate((status) => {
        statusUpdates.push(status);
      });

      await appInitializationService.initialize();
      unsubscribe();

      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[0].stage).toBe('starting');
      expect(statusUpdates[statusUpdates.length - 1].stage).toBe('complete');
      expect(statusUpdates[statusUpdates.length - 1].progress).toBe(100);
    });

    it('should return same promise for concurrent initialization calls', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue({
        title: 'Test Wiki',
        description: 'Test Description',
        allowGuestAccess: false,
        theme: 'default',
        features: {
          fileUpload: true,
          userManagement: true,
          search: true,
          pageHistory: false
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024,
          maxPages: 1000,
          maxFilesPerPage: 20
        }
      });

      const promise1 = appInitializationService.initialize();
      const promise2 = appInitializationService.initialize();

      // Both should resolve to the same result
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toEqual(result2);
      expect(result1.success).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const { authStore } = await import('../stores/auth.js');
      
      // Mock auth initialization failure
      vi.mocked(authStore.init).mockRejectedValue(new Error('Auth failed'));

      const result = await appInitializationService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Auth failed');
      expect(appInitializationService.isInitialized()).toBe(false);
    });

    it('should return success immediately if already initialized', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue({
        title: 'Test Wiki',
        description: 'Test Description',
        allowGuestAccess: false,
        theme: 'default',
        features: {
          fileUpload: true,
          userManagement: true,
          search: true,
          pageHistory: false
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024,
          maxPages: 1000,
          maxFilesPerPage: 20
        }
      });

      // Reset the service to ensure clean state
      appInitializationService.reset();

      // First initialization
      const result1 = await appInitializationService.initialize();
      expect(result1.success).toBe(true);
      expect(appInitializationService.isInitialized()).toBe(true);

      // Second initialization should return immediately
      const result2 = await appInitializationService.initialize();
      expect(result2.success).toBe(true);
    });
  });

  describe('performHealthChecks', () => {
    it('should check service health', async () => {
      const { s3Service } = await import('./s3.js');
      const { authStore } = await import('../stores/auth.js');

      vi.mocked(s3Service.getConfig).mockResolvedValue({
        title: 'Test Wiki',
        description: 'Test Description',
        allowGuestAccess: false,
        theme: 'default',
        features: {
          fileUpload: true,
          userManagement: true,
          search: true,
          pageHistory: false
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024,
          maxPages: 1000,
          maxFilesPerPage: 20
        }
      });
      vi.mocked(authStore.refreshToken).mockResolvedValue('token');

      const healthChecks = await appInitializationService.performHealthChecks();

      expect(healthChecks.s3).toBe(true);
      expect(healthChecks.auth).toBe(true);
    });

    it('should report failed health checks', async () => {
      const { s3Service } = await import('./s3.js');
      const { authStore } = await import('../stores/auth.js');

      vi.mocked(s3Service.getConfig).mockRejectedValue(new Error('S3 failed'));
      vi.mocked(authStore.refreshToken).mockRejectedValue(new Error('Auth failed'));

      const healthChecks = await appInitializationService.performHealthChecks();

      expect(healthChecks.s3).toBe(false);
      expect(healthChecks.auth).toBe(false);
    });
  });

  describe('getDiagnostics', () => {
    it('should return diagnostic information', () => {
      const diagnostics = appInitializationService.getDiagnostics();

      expect(diagnostics).toHaveProperty('initialized');
      expect(diagnostics).toHaveProperty('timestamp');
      expect(diagnostics).toHaveProperty('userAgent');
      expect(diagnostics).toHaveProperty('url');
      expect(diagnostics.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('status callbacks', () => {
    it('should handle callback errors gracefully', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue({
        title: 'Test Wiki',
        description: 'Test Description',
        allowGuestAccess: false,
        theme: 'default',
        features: {
          fileUpload: true,
          userManagement: true,
          search: true,
          pageHistory: false
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024,
          maxPages: 1000,
          maxFilesPerPage: 20
        }
      });

      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const unsubscribe = appInitializationService.onStatusUpdate(errorCallback);

      // Should not throw despite callback error
      await expect(appInitializationService.initialize()).resolves.toBeDefined();
      
      unsubscribe();
    });

    it('should allow unsubscribing from status updates', async () => {
      const callback = vi.fn();
      const unsubscribe = appInitializationService.onStatusUpdate(callback);
      
      unsubscribe();

      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue({
        title: 'Test Wiki',
        description: 'Test Description',
        allowGuestAccess: false,
        theme: 'default',
        features: {
          fileUpload: true,
          userManagement: true,
          search: true,
          pageHistory: false
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024,
          maxPages: 1000,
          maxFilesPerPage: 20
        }
      });

      await appInitializationService.initialize();

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
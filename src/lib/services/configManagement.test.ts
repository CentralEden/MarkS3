/**
 * Configuration Management Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3ConfigManagementService } from './configManagement.js';
import { WikiError, ErrorCodes } from '../types/errors.js';
import type { WikiConfig } from '../types/wiki.js';

// Mock the S3 service
vi.mock('./s3.js', () => ({
  s3Service: {
    getConfig: vi.fn(),
    saveConfig: vi.fn()
  }
}));

describe('S3ConfigManagementService', () => {
  let configService: S3ConfigManagementService;
  const mockConfig: WikiConfig = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    configService = new S3ConfigManagementService();
    configService.clearCache();
  });

  describe('getConfig', () => {
    it('should get configuration from S3', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue(mockConfig);

      const config = await configService.getConfig();

      expect(config).toEqual(mockConfig);
      expect(s3Service.getConfig).toHaveBeenCalledTimes(1);
    });

    it('should use cached configuration', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue(mockConfig);

      // First call
      await configService.getConfig();
      // Second call should use cache
      await configService.getConfig();

      expect(s3Service.getConfig).toHaveBeenCalledTimes(1);
    });

    it('should handle S3 errors', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockRejectedValue(new Error('S3 error'));

      await expect(configService.getConfig()).rejects.toThrow(WikiError);
    });
  });

  describe('saveConfig', () => {
    it('should save valid configuration', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.saveConfig).mockResolvedValue();

      await configService.saveConfig(mockConfig);

      expect(s3Service.saveConfig).toHaveBeenCalledWith(mockConfig);
    });

    it('should validate configuration before saving', async () => {
      const invalidConfig = {
        ...mockConfig,
        title: '' // Invalid empty title
      };

      await expect(configService.saveConfig(invalidConfig)).rejects.toThrow(WikiError);
    });

    it('should handle S3 save errors', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.saveConfig).mockRejectedValue(new Error('Save failed'));

      await expect(configService.saveConfig(mockConfig)).rejects.toThrow(WikiError);
    });
  });

  describe('updateGuestAccess', () => {
    it('should update guest access setting', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue(mockConfig);
      vi.mocked(s3Service.saveConfig).mockResolvedValue();

      await configService.updateGuestAccess(true);

      expect(s3Service.saveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        allowGuestAccess: true
      });
    });
  });

  describe('updateWikiTitle', () => {
    it('should update wiki title', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue(mockConfig);
      vi.mocked(s3Service.saveConfig).mockResolvedValue();

      const newTitle = 'New Wiki Title';
      await configService.updateWikiTitle(newTitle);

      expect(s3Service.saveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        title: newTitle
      });
    });

    it('should reject empty title', async () => {
      await expect(configService.updateWikiTitle('')).rejects.toThrow(WikiError);
      await expect(configService.updateWikiTitle('   ')).rejects.toThrow(WikiError);
    });
  });

  describe('updateWikiDescription', () => {
    it('should update wiki description', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue(mockConfig);
      vi.mocked(s3Service.saveConfig).mockResolvedValue();

      const newDescription = 'New description';
      await configService.updateWikiDescription(newDescription);

      expect(s3Service.saveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        description: newDescription
      });
    });
  });

  describe('updateFeatures', () => {
    it('should update feature settings', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue(mockConfig);
      vi.mocked(s3Service.saveConfig).mockResolvedValue();

      const featureUpdates = { fileUpload: false, search: false };
      await configService.updateFeatures(featureUpdates);

      expect(s3Service.saveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        features: {
          ...mockConfig.features,
          ...featureUpdates
        }
      });
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const result = configService.validateConfig(mockConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration with empty title', () => {
      const invalidConfig = { ...mockConfig, title: '' };
      const result = configService.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject configuration with long title', () => {
      const invalidConfig = { ...mockConfig, title: 'x'.repeat(101) };
      const result = configService.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be 100 characters or less');
    });

    it('should reject configuration with long description', () => {
      const invalidConfig = { ...mockConfig, description: 'x'.repeat(501) };
      const result = configService.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Description must be 500 characters or less');
    });

    it('should reject configuration with invalid theme', () => {
      const invalidConfig = { ...mockConfig, theme: 'invalid-theme' };
      const result = configService.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Theme must be one of: default, dark, light');
    });

    it('should reject configuration with invalid allowGuestAccess', () => {
      const invalidConfig = { ...mockConfig, allowGuestAccess: 'true' as any };
      const result = configService.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('allowGuestAccess must be a boolean');
    });

    it('should reject configuration with invalid features', () => {
      const invalidConfig = { ...mockConfig, features: null as any };
      const result = configService.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('features must be an object');
    });

    it('should reject configuration with invalid feature values', () => {
      const invalidConfig = {
        ...mockConfig,
        features: {
          ...mockConfig.features,
          fileUpload: 'true' as any,
          userManagement: 'false' as any
        }
      };
      const result = configService.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('features.fileUpload must be a boolean');
      expect(result.errors).toContain('features.userManagement must be a boolean');
    });
  });

  describe('isGuestAccessEnabled', () => {
    it('should return guest access status', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue({
        ...mockConfig,
        allowGuestAccess: true
      });

      const isEnabled = await configService.isGuestAccessEnabled();
      expect(isEnabled).toBe(true);
    });
  });

  describe('getFeatureConfig', () => {
    it('should return specific feature configuration', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue(mockConfig);

      const fileUploadEnabled = await configService.getFeatureConfig('fileUpload');
      expect(fileUploadEnabled).toBe(true);

      const pageHistoryEnabled = await configService.getFeatureConfig('pageHistory');
      expect(pageHistoryEnabled).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear configuration cache', async () => {
      const { s3Service } = await import('./s3.js');
      vi.mocked(s3Service.getConfig).mockResolvedValue(mockConfig);

      // Load config to cache it
      await configService.getConfig();
      expect(s3Service.getConfig).toHaveBeenCalledTimes(1);

      // Clear cache
      configService.clearCache();

      // Next call should fetch from S3 again
      await configService.getConfig();
      expect(s3Service.getConfig).toHaveBeenCalledTimes(2);
    });
  });
});
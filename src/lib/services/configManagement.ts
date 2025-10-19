/**
 * Configuration Management Service
 * Handles wiki configuration management with real-time updates
 */

import { writable, type Writable } from 'svelte/store';
import type { WikiConfig } from '../types/wiki.js';
import { s3Service } from './s3.js';
import { WikiError, ErrorCodes } from '../types/errors.js';
import { APP_CONFIG } from '../config/app.js';

export interface ConfigManagementService {
  getConfig(): Promise<WikiConfig>;
  saveConfig(config: WikiConfig): Promise<void>;
  updateGuestAccess(allowGuestAccess: boolean): Promise<void>;
  updateWikiTitle(title: string): Promise<void>;
  updateWikiDescription(description: string): Promise<void>;
  updateFeatures(features: Partial<WikiConfig['features']>): Promise<void>;
  validateConfig(config: WikiConfig): { valid: boolean; errors: string[] };
  resetToDefaults(): Promise<void>;
}

export class S3ConfigManagementService implements ConfigManagementService {
  private configCache: WikiConfig | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current wiki configuration with caching
   */
  async getConfig(): Promise<WikiConfig> {
    const now = Date.now();
    
    // Return cached config if it's still fresh
    if (this.configCache && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.configCache;
    }

    try {
      const config = await s3Service.getConfig();
      this.configCache = config;
      this.lastFetchTime = now;
      
      // Update the reactive store
      configStore.set(config);
      
      return config;
    } catch (error) {
      console.error('Failed to get config:', error);
      throw new WikiError(
        ErrorCodes.CONFIG_ERROR,
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Save wiki configuration with validation
   */
  async saveConfig(config: WikiConfig): Promise<void> {
    // Validate configuration before saving
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new WikiError(
        ErrorCodes.CONFIG_ERROR,
        `Invalid configuration: ${validation.errors.join(', ')}`
      );
    }

    try {
      await s3Service.saveConfig(config);
      
      // Update cache and store
      this.configCache = config;
      this.lastFetchTime = Date.now();
      configStore.set(config);
      
      // Trigger config change event
      configChangeStore.set({
        timestamp: new Date(),
        config: config
      });
      
    } catch (error) {
      console.error('Failed to save config:', error);
      throw new WikiError(
        ErrorCodes.CONFIG_ERROR,
        `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update guest access setting
   */
  async updateGuestAccess(allowGuestAccess: boolean): Promise<void> {
    const currentConfig = await this.getConfig();
    const updatedConfig = {
      ...currentConfig,
      allowGuestAccess
    };
    
    await this.saveConfig(updatedConfig);
  }

  /**
   * Update wiki title
   */
  async updateWikiTitle(title: string): Promise<void> {
    if (!title.trim()) {
      throw new WikiError(
        ErrorCodes.CONFIG_ERROR,
        'Wiki title cannot be empty'
      );
    }

    const currentConfig = await this.getConfig();
    const updatedConfig = {
      ...currentConfig,
      title: title.trim()
    };
    
    await this.saveConfig(updatedConfig);
  }

  /**
   * Update wiki description
   */
  async updateWikiDescription(description: string): Promise<void> {
    const currentConfig = await this.getConfig();
    const updatedConfig = {
      ...currentConfig,
      description: description.trim()
    };
    
    await this.saveConfig(updatedConfig);
  }

  /**
   * Update feature settings
   */
  async updateFeatures(features: Partial<WikiConfig['features']>): Promise<void> {
    const currentConfig = await this.getConfig();
    const updatedConfig = {
      ...currentConfig,
      features: {
        ...currentConfig.features,
        ...features
      }
    };
    
    await this.saveConfig(updatedConfig);
  }

  /**
   * Validate configuration object
   */
  validateConfig(config: WikiConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!config.title || config.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (config.title && config.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }

    if (config.description && config.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    // Validate theme
    const validThemes = ['default', 'dark', 'light'];
    if (config.theme && !validThemes.includes(config.theme)) {
      errors.push(`Theme must be one of: ${validThemes.join(', ')}`);
    }

    // Validate boolean fields
    if (typeof config.allowGuestAccess !== 'boolean') {
      errors.push('allowGuestAccess must be a boolean');
    }

    // Validate features object
    if (!config.features || typeof config.features !== 'object') {
      errors.push('features must be an object');
    } else {
      if (typeof config.features.fileUpload !== 'boolean') {
        errors.push('features.fileUpload must be a boolean');
      }
      if (typeof config.features.userManagement !== 'boolean') {
        errors.push('features.userManagement must be a boolean');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfig = { ...APP_CONFIG.defaultWikiConfig };
    await this.saveConfig(defaultConfig);
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.configCache = null;
    this.lastFetchTime = 0;
  }

  /**
   * Check if guest access is currently enabled
   */
  async isGuestAccessEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.allowGuestAccess;
  }

  /**
   * Get configuration for a specific feature
   */
  async getFeatureConfig(feature: keyof WikiConfig['features']): Promise<boolean> {
    const config = await this.getConfig();
    return config.features[feature];
  }
}

// Configuration change event interface
export interface ConfigChangeEvent {
  timestamp: Date;
  config: WikiConfig;
}

// Reactive stores for configuration
export const configStore: Writable<WikiConfig | null> = writable(null);
export const configChangeStore: Writable<ConfigChangeEvent | null> = writable(null);

// Derived stores for specific config values
export const guestAccessStore = writable(false);
export const wikiTitleStore = writable('');
export const wikiDescriptionStore = writable('');

// Update derived stores when main config changes
configStore.subscribe((config) => {
  if (config) {
    guestAccessStore.set(config.allowGuestAccess);
    wikiTitleStore.set(config.title);
    wikiDescriptionStore.set(config.description);
  }
});

// Export singleton instance
export const configManagementService = new S3ConfigManagementService();

// Initialize configuration on module load (browser only)
if (typeof window !== 'undefined') {
  configManagementService.getConfig().catch(error => {
    console.error('Failed to initialize configuration:', error);
  });
}
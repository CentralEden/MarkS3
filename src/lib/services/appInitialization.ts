/**
 * Application Initialization Service
 * Handles startup tasks, configuration loading, and error handling
 */

import { get } from 'svelte/store';
import { authStore } from '../stores/auth.js';
import { s3Service } from './s3.js';
import { wikiService } from './wiki.js';
import { fileService } from './files.js';
import type { WikiConfig } from '../types/wiki.js';
import { WikiError, ErrorCodes } from '../types/errors.js';

export interface InitializationResult {
  success: boolean;
  error?: string;
  config?: WikiConfig;
  warnings?: string[];
}

export interface InitializationStatus {
  stage: 'starting' | 'auth' | 'config' | 'services' | 'metadata' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
}

class AppInitializationService {
  private initialized = false;
  private initPromise: Promise<InitializationResult> | null = null;
  private statusCallbacks: ((status: InitializationStatus) => void)[] = [];

  /**
   * Initialize the application
   */
  async initialize(): Promise<InitializationResult> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return success if already initialized
    if (this.initialized) {
      return { success: true };
    }

    this.initPromise = this.performInitialization();
    const result = await this.initPromise;
    
    if (result.success) {
      this.initialized = true;
    }

    return result;
  }

  /**
   * Add a callback to receive initialization status updates
   */
  onStatusUpdate(callback: (status: InitializationStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Check if the application is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset initialization state (for testing or re-initialization)
   */
  reset(): void {
    this.initialized = false;
    this.initPromise = null;
  }

  private updateStatus(status: InitializationStatus): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  private async performInitialization(): Promise<InitializationResult> {
    const warnings: string[] = [];

    try {
      // Stage 1: Starting
      this.updateStatus({
        stage: 'starting',
        message: 'Initializing application...',
        progress: 0
      });

      // Stage 2: Authentication
      this.updateStatus({
        stage: 'auth',
        message: 'Setting up authentication...',
        progress: 20
      });

      await authStore.init();

      // Stage 3: Configuration
      this.updateStatus({
        stage: 'config',
        message: 'Loading configuration...',
        progress: 40
      });

      let config: WikiConfig;
      try {
        config = await this.loadConfiguration();
      } catch (error) {
        // If config loading fails, use default config
        console.warn('Failed to load configuration, using defaults:', error);
        warnings.push('Configuration could not be loaded, using default settings');
        config = this.getDefaultConfiguration();
      }

      // Stage 4: Services
      this.updateStatus({
        stage: 'services',
        message: 'Initializing services...',
        progress: 60
      });

      await this.initializeServices(config);

      // Stage 5: Metadata
      this.updateStatus({
        stage: 'metadata',
        message: 'Loading metadata...',
        progress: 80
      });

      await this.loadMetadata();

      // Stage 6: Complete
      this.updateStatus({
        stage: 'complete',
        message: 'Application ready',
        progress: 100
      });

      return {
        success: true,
        config,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      
      this.updateStatus({
        stage: 'error',
        message: `Initialization failed: ${errorMessage}`,
        progress: 0
      });

      console.error('Application initialization failed:', error);
      
      return {
        success: false,
        error: errorMessage,
        warnings
      };
    }
  }

  private async loadConfiguration(): Promise<WikiConfig> {
    try {
      return await s3Service.getConfig();
    } catch (error) {
      if (error instanceof WikiError && error.code === ErrorCodes.FILE_NOT_FOUND) {
        // Config doesn't exist yet, create default
        const defaultConfig = this.getDefaultConfiguration();
        await s3Service.saveConfig(defaultConfig);
        return defaultConfig;
      }
      throw error;
    }
  }

  private getDefaultConfiguration(): WikiConfig {
    return {
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
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxPages: 1000,
        maxFilesPerPage: 20
      }
    };
  }

  private async initializeServices(config: WikiConfig): Promise<void> {
    // Services are already initialized when imported
    // This is a placeholder for any future service initialization needs
    console.log('Services initialized with config:', config.title);
  }

  private async loadMetadata(): Promise<void> {
    try {
      // Pre-load page metadata for better performance
      await wikiService.getPageHierarchy();
    } catch (error) {
      // Non-critical error, just log it
      console.warn('Failed to pre-load page metadata:', error);
    }

    try {
      // Pre-load file list
      await fileService.listFiles();
    } catch (error) {
      // Non-critical error, just log it
      console.warn('Failed to pre-load file list:', error);
    }
  }

  /**
   * Perform health checks on critical services
   */
  async performHealthChecks(): Promise<{ [service: string]: boolean }> {
    const results: { [service: string]: boolean } = {};

    // Check S3 connectivity
    try {
      await s3Service.getConfig();
      results.s3 = true;
    } catch (error) {
      results.s3 = false;
      console.error('S3 health check failed:', error);
    }

    // Check authentication service
    try {
      await authStore.refreshToken();
      results.auth = true;
    } catch (error) {
      results.auth = false;
      console.error('Auth health check failed:', error);
    }

    return results;
  }

  /**
   * Get initialization diagnostics
   */
  getDiagnostics(): {
    initialized: boolean;
    timestamp: Date;
    userAgent: string;
    url: string;
  } {
    return {
      initialized: this.initialized,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
    };
  }
}

// Export singleton instance
export const appInitializationService = new AppInitializationService();
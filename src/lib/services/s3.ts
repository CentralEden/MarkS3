/**
 * S3 Storage Service Implementation
 * Handles all S3 operations for the MarkS3 wiki system
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  type GetObjectCommandOutput,
  type PutObjectCommandOutput,
  type ListObjectsV2CommandOutput
} from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import type {
  S3Service as IS3Service,
  WikiPage,
  WikiPageMeta,
  WikiConfig,
  FileInfo,
  SaveResult,
  MetadataOperation
} from '../types/index.js';
import { WikiError, ErrorCodes } from '../types/index.js';
import { getAWSConfig, APP_CONFIG } from '../config/app.js';
import { executeWithRetry, AWSService, createUserFriendlyError } from '../utils/awsErrorHandler.js';

/**
 * S3 Service implementation
 */
export class S3Service implements IS3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private config: ReturnType<typeof getAWSConfig>;

  constructor() {
    this.config = getAWSConfig();
    this.bucketName = this.config.bucketName;
    
    // Initialize S3 client with browser-compatible configuration
    this.s3Client = new S3Client({
      region: this.config.region,
      // Browser-specific request handler configuration
      requestHandler: {
        requestTimeout: 30000,
        // Remove Node.js specific httpsAgent for browser compatibility
        httpsAgent: undefined
      },
      // Use browser-compatible Cognito credentials
      credentials: fromCognitoIdentityPool({
        clientConfig: { 
          region: this.config.region,
          // Ensure browser compatibility
          runtime: 'browser'
        },
        identityPoolId: this.config.cognitoIdentityPoolId
      }),
      // Browser-specific configuration
      runtime: 'browser',
      // Add retry configuration for network resilience
      maxAttempts: 3,
      retryMode: 'adaptive',
      // CORS-compatible request signing
      forcePathStyle: false, // Use virtual-hosted-style requests for better CORS support
      // Ensure proper browser request handling
      useAccelerateEndpoint: false,
      useDualstackEndpoint: false
    });
  }

  /**
   * Check if bucket exists and is accessible with detailed error reporting
   */
  async checkBucketAccess(): Promise<{ accessible: boolean; error?: WikiError }> {
    try {
      // Try to list objects in the bucket to verify access with retry logic
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1
      });
      
      await executeWithRetry(() => this.s3Client.send(command), AWSService.S3);
      return { accessible: true };
    } catch (error: any) {
      console.error('Bucket access check failed:', error);
      return { 
        accessible: false, 
        error: error instanceof WikiError ? error : createUserFriendlyError(error, AWSService.S3)
      };
    }
  }

  /**
   * Initialize the wiki by creating necessary folder structure
   */
  async initializeWiki(): Promise<void> {
    try {
      // Create default config if it doesn't exist
      const config = await this.getConfig();
      await this.saveConfig(config);

      // Create empty metadata file if it doesn't exist
      try {
        await this.updateMetadata({
          type: 'add',
          pageData: {
            path: 'index.md',
            title: 'Welcome to MarkS3',
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'system'
          }
        });
      } catch (error) {
        // Metadata file might already exist, that's ok
        console.log('Metadata initialization skipped (may already exist)');
      }

      console.log('Wiki initialization completed');
    } catch (error: any) {
      throw createUserFriendlyError(error, AWSService.S3);
    }
  }

  /**
   * Get a wiki page from S3 with retry logic
   */
  async getPage(path: string): Promise<WikiPage> {
    return executeWithRetry(async () => {
      const key = APP_CONFIG.s3Paths.pages + path;
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new WikiError(
          'BUCKET_NOT_FOUND' as ErrorCodes,
          `Page not found: ${path}`
        );
      }

      const content = await this.streamToString(response.Body);
      const metadata = this.parsePageMetadata(response.Metadata || {});

      return {
        path,
        title: this.extractTitleFromPath(path),
        content,
        metadata,
        etag: response.ETag?.replace(/"/g, '') // Remove quotes from ETag
      };
    }, AWSService.S3);
  }

  /**
   * Save a wiki page to S3 with optimistic locking
   */
  async savePage(page: WikiPage, etag?: string): Promise<SaveResult> {
    try {
      const key = APP_CONFIG.s3Paths.pages + page.path;
      
      // Update metadata with new version and timestamp
      const updatedMetadata = {
        ...page.metadata,
        updatedAt: new Date(),
        version: page.metadata.version + 1
      };

      // Prepare S3 metadata
      const s3Metadata = {
        'created-at': updatedMetadata.createdAt.toISOString(),
        'updated-at': updatedMetadata.updatedAt.toISOString(),
        'author': updatedMetadata.author,
        'version': updatedMetadata.version.toString(),
        'title': page.title,
        ...(updatedMetadata.tags && { 'tags': updatedMetadata.tags.join(',') })
      };

      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: page.content,
        ContentType: 'text/markdown',
        Metadata: s3Metadata,
        ...(etag && { IfMatch: `"${etag}"` }) // Conditional put for optimistic locking
      });

      const response = await this.s3Client.send(putCommand);

      // Update metadata index atomically
      await this.updateMetadata({
        type: 'update',
        pageData: {
          path: page.path,
          title: page.title,
          createdAt: updatedMetadata.createdAt,
          updatedAt: updatedMetadata.updatedAt,
          author: updatedMetadata.author,
          tags: updatedMetadata.tags
        },
        expectedVersion: etag
      });

      return {
        success: true,
        etag: response.ETag?.replace(/"/g, '') || '',
        conflict: false
      };
    } catch (error: any) {
      if (error.name === 'PreconditionFailed' || error.code === 'PreconditionFailed') {
        // ETag mismatch - conflict detected
        try {
          const currentPage = await this.getPage(page.path);
          return {
            success: false,
            etag: currentPage.etag || '',
            conflict: true,
            conflictData: currentPage
          };
        } catch (getError) {
          // If we can't get the current page, return a generic conflict
          return {
            success: false,
            etag: '',
            conflict: true
          };
        }
      }
      throw this.handleS3Error(error);
    }
  }

  /**
   * Delete a wiki page from S3 with retry logic
   */
  async deletePage(path: string): Promise<void> {
    return executeWithRetry(async () => {
      const key = APP_CONFIG.s3Paths.pages + path;
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
    }, AWSService.S3);
  }

  /**
   * List wiki pages with optional prefix filter and retry logic
   */
  async listPages(prefix?: string): Promise<WikiPageMeta[]> {
    return executeWithRetry(async () => {
      const key = APP_CONFIG.s3Paths.pages + (prefix || '');
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: key,
        Delimiter: '/'
      });

      const response = await this.s3Client.send(command);
      const pages: WikiPageMeta[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Key.endsWith('.md')) {
            const path = object.Key.replace(APP_CONFIG.s3Paths.pages, '');
            
            // Get metadata for each page with individual retry
            try {
              const headCommand = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: object.Key
              });
              const headResponse = await this.s3Client.send(headCommand);
              const metadata = this.parsePageMetadata(headResponse.Metadata || {});

              pages.push({
                path,
                title: headResponse.Metadata?.['title'] || this.extractTitleFromPath(path),
                createdAt: metadata.createdAt,
                updatedAt: metadata.updatedAt,
                author: metadata.author,
                tags: metadata.tags
              });
            } catch (error) {
              // If we can't get metadata, create basic entry
              console.warn(`Failed to get metadata for ${path}:`, error);
              pages.push({
                path,
                title: this.extractTitleFromPath(path),
                createdAt: object.LastModified || new Date(),
                updatedAt: object.LastModified || new Date(),
                author: 'unknown'
              });
            }
          }
        }
      }

      return pages;
    }, AWSService.S3);
  }

  /**
   * Upload a file to S3 with validation and retry logic
   */
  async uploadFile(file: File, path: string): Promise<string> {
    // Validate file size
    if (file.size > APP_CONFIG.maxFileSize) {
      throw new WikiError(
        'FILE_TOO_LARGE' as ErrorCodes,
        `File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds maximum allowed size of ${APP_CONFIG.maxFileSize / (1024 * 1024)}MB.`
      );
    }

    return executeWithRetry(async () => {
      const key = APP_CONFIG.s3Paths.files + path;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: file.type || 'application/octet-stream',
        Metadata: {
          'original-name': file.name,
          'uploaded-at': new Date().toISOString(),
          'size': file.size.toString(),
          'content-type': file.type || 'application/octet-stream'
        }
      });

      await this.s3Client.send(command);
      return key;
    }, AWSService.S3);
  }

  /**
   * Delete a file from S3 with retry logic
   */
  async deleteFile(path: string): Promise<void> {
    return executeWithRetry(async () => {
      const key = APP_CONFIG.s3Paths.files + path;
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
    }, AWSService.S3);
  }

  /**
   * List all uploaded files
   */
  async listFiles(): Promise<FileInfo[]> {
    return executeWithRetry(async () => {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: APP_CONFIG.s3Paths.files
      });

      const response = await this.s3Client.send(command);
      const files: FileInfo[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            const path = object.Key.replace(APP_CONFIG.s3Paths.files, '');
            
            // Get file metadata with individual retry
            try {
              const headCommand = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: object.Key
              });
              const headResponse = await this.executeWithRetry(() => this.s3Client.send(headCommand));
              const metadata = headResponse.Metadata || {};

              files.push({
                id: path,
                filename: metadata['original-name'] || path,
                size: parseInt(metadata['size'] || '0'),
                contentType: headResponse.ContentType || 'application/octet-stream',
                uploadedAt: new Date(metadata['uploaded-at'] || object.LastModified || new Date()),
                url: await this.getFileUrl(path)
              });
            } catch (error) {
              // If we can't get metadata, create basic entry
              console.warn(`Failed to get metadata for file ${path}:`, error);
              files.push({
                id: path,
                filename: path,
                size: object.Size || 0,
                contentType: 'application/octet-stream',
                uploadedAt: object.LastModified || new Date(),
                url: await this.getFileUrl(path)
              });
            }
          }
        }
      }

      return files;
    }, AWSService.S3);
  }

  /**
   * Get a URL for file access with proper CORS handling
   */
  async getFileUrl(path: string): Promise<string> {
    try {
      const key = APP_CONFIG.s3Paths.files + path;
      
      // Use virtual-hosted-style URLs for better CORS compatibility
      // This format works better with browser CORS policies
      const url = `https://${this.bucketName}.s3.${this.config.region}.amazonaws.com/${encodeURIComponent(key)}`;
      
      // In a production environment, you might want to use signed URLs for security:
      // const getObjectCommand = new GetObjectCommand({
      //   Bucket: this.bucketName,
      //   Key: key
      // });
      // return await getSignedUrl(this.s3Client, getObjectCommand, { expiresIn: 3600 });
      
      return url;
    } catch (error: any) {
      console.error('Error generating file URL:', error);
      // Fallback to basic URL construction
      const key = APP_CONFIG.s3Paths.files + path;
      return `https://${this.bucketName}.s3.${this.config.region}.amazonaws.com/${encodeURIComponent(key)}`;
    }
  }

  /**
   * Check if a page has been modified since the given ETag
   */
  async checkPageConflict(path: string, expectedETag: string): Promise<boolean> {
    try {
      const key = APP_CONFIG.s3Paths.pages + path;
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);
      const currentETag = response.ETag?.replace(/"/g, '');
      
      return currentETag !== expectedETag;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        // Page doesn't exist, so there's a conflict if we expected it to exist
        return expectedETag !== '';
      }
      throw this.handleS3Error(error);
    }
  }

  /**
   * Get the current ETag for a page without downloading content
   */
  async getPageETag(path: string): Promise<string | null> {
    try {
      const key = APP_CONFIG.s3Paths.pages + path;
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);
      return response.ETag?.replace(/"/g, '') || null;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        return null;
      }
      throw this.handleS3Error(error);
    }
  }

  /**
   * Get wiki configuration
   */
  async getConfig(): Promise<WikiConfig> {
    try {
      const key = APP_CONFIG.s3Paths.config + 'wiki.json';
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await executeWithRetry(() => this.s3Client.send(command), AWSService.S3);
      
      if (!response.Body) {
        return APP_CONFIG.defaultWikiConfig;
      }

      const configText = await this.streamToString(response.Body);
      return JSON.parse(configText);
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        // Return default config if not found
        return APP_CONFIG.defaultWikiConfig;
      }
      throw this.handleS3Error(error);
    }
  }

  /**
   * Save wiki configuration
   */
  async saveConfig(config: WikiConfig): Promise<void> {
    return executeWithRetry(async () => {
      const key = APP_CONFIG.s3Paths.config + 'wiki.json';
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(config, null, 2),
        ContentType: 'application/json'
      });

      await this.s3Client.send(command);
    }, AWSService.S3);
  }

  /**
   * Update metadata atomically with optimistic locking
   */
  async updateMetadata(operation: MetadataOperation): Promise<void> {
    const key = APP_CONFIG.s3Paths.metadata + 'pages.json';
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Get current metadata with ETag
        let metadata: { pages: WikiPageMeta[]; version?: number } = { pages: [], version: 1 };
        let currentETag: string | undefined;

        try {
          const getCommand = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key
          });
          const response = await this.s3Client.send(getCommand);
          
          if (response.Body) {
            const metadataText = await this.streamToString(response.Body);
            metadata = JSON.parse(metadataText);
            currentETag = response.ETag?.replace(/"/g, '');
          }
        } catch (error: any) {
          if (error.name !== 'NoSuchKey' && error.name !== 'NotFound') {
            throw error;
          }
          // File doesn't exist yet, that's ok for first time
        }

        // Validate expected version if provided
        if (operation.expectedVersion && currentETag && operation.expectedVersion !== currentETag) {
          throw new WikiError(
            'EDIT_CONFLICT' as ErrorCodes,
            'Metadata has been modified by another user'
          );
        }

        // Apply operation
        switch (operation.type) {
          case 'add':
            // Check if page already exists
            const existingIndex = metadata.pages.findIndex(p => p.path === operation.pageData.path);
            if (existingIndex >= 0) {
              metadata.pages[existingIndex] = operation.pageData;
            } else {
              metadata.pages.push(operation.pageData);
            }
            break;
          case 'update':
            const updateIndex = metadata.pages.findIndex(p => p.path === operation.pageData.path);
            if (updateIndex >= 0) {
              metadata.pages[updateIndex] = operation.pageData;
            } else {
              metadata.pages.push(operation.pageData);
            }
            break;
          case 'delete':
            metadata.pages = metadata.pages.filter(p => p.path !== operation.pageData.path);
            break;
        }

        // Increment version
        metadata.version = (metadata.version || 1) + 1;

        // Save updated metadata with conditional put
        const saveCommand = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: JSON.stringify(metadata, null, 2),
          ContentType: 'application/json',
          ...(currentETag && { IfMatch: `"${currentETag}"` })
        });

        await this.s3Client.send(saveCommand);
        return; // Success, exit retry loop

      } catch (error: any) {
        if (error.name === 'PreconditionFailed' || error.code === 'PreconditionFailed') {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new WikiError(
              'EDIT_CONFLICT' as ErrorCodes,
              'Failed to update metadata after multiple attempts due to conflicts'
            );
          }
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
          continue;
        }
        throw this.handleS3Error(error);
      }
    }
  }

  // Helper methods

  /**
   * Convert stream to string
   */
  private async streamToString(stream: any): Promise<string> {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const concatenated = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(concatenated);
  }

  /**
   * Parse page metadata from S3 object metadata
   */
  private parsePageMetadata(metadata: Record<string, string>): import('../types/wiki.js').PageMetadata {
    return {
      createdAt: new Date(metadata['created-at'] || Date.now()),
      updatedAt: new Date(metadata['updated-at'] || Date.now()),
      author: metadata['author'] || 'unknown',
      version: parseInt(metadata['version'] || '1'),
      tags: metadata['tags'] ? metadata['tags'].split(',') : undefined
    };
  }

  /**
   * Extract title from file path
   */
  private extractTitleFromPath(path: string): string {
    const filename = path.split('/').pop() || path;
    return filename.replace(/\.md$/, '').replace(/[-_]/g, ' ');
  }

  /**
   * Execute an operation with retry logic for network errors
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw this.handleS3Error(error);
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter for better distribution
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter
        const delay = baseDelay * Math.pow(2, attempt) + jitter;
        console.warn(`S3 operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw this.handleS3Error(lastError);
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const nonRetryableErrors = [
      'AccessDenied',
      'NoSuchBucket',
      'NoSuchKey',
      'NotFound',
      'PreconditionFailed',
      'InvalidRequest',
      'MalformedPolicy',
      'InvalidAccessKeyId',
      'SignatureDoesNotMatch',
      'EntityTooLarge',
      'InvalidBucketName',
      'BucketAlreadyExists',
      'BucketNotEmpty',
      'InvalidStorageClass',
      'InvalidArgument',
      'MalformedXML',
      'RequestTimeTooSkewed',
      // Browser-specific CORS errors
      'CORSError',
      'NetworkError', // Some network errors shouldn't be retried
      'AbortError' // User cancelled request
    ];
    
    // Also check for CORS-related errors in the message
    if (error.message && (
      error.message.includes('CORS') ||
      error.message.includes('Cross-Origin') ||
      error.message.includes('blocked by CORS policy')
    )) {
      return true;
    }
    
    return nonRetryableErrors.includes(error.name) || nonRetryableErrors.includes(error.code);
  }

  /**
   * Handle S3 errors and convert to WikiError with detailed messages
   */
  private handleS3Error(error: any): WikiError {
    console.error('S3 Error:', error);
    
    // Authentication and authorization errors
    if (error.name === 'AccessDenied' || error.code === 'AccessDenied') {
      return new WikiError(
        'S3_ACCESS_DENIED' as ErrorCodes,
        'Access denied to S3 bucket. Please check your AWS credentials and bucket permissions. ' +
        'Ensure your Cognito identity pool has the necessary S3 permissions.',
        error
      );
    }
    
    if (error.name === 'InvalidAccessKeyId' || error.code === 'InvalidAccessKeyId') {
      return new WikiError(
        'AUTH_FAILED' as ErrorCodes,
        'Invalid AWS access key. Please check your Cognito configuration.',
        error
      );
    }
    
    if (error.name === 'SignatureDoesNotMatch' || error.code === 'SignatureDoesNotMatch') {
      return new WikiError(
        'AUTH_FAILED' as ErrorCodes,
        'AWS signature mismatch. Please check your credentials and system clock.',
        error
      );
    }
    
    // Bucket and resource errors
    if (error.name === 'NoSuchBucket' || error.code === 'NoSuchBucket') {
      return new WikiError(
        'BUCKET_NOT_FOUND' as ErrorCodes,
        `S3 bucket "${this.bucketName}" not found. Please check your bucket name and region configuration.`,
        error
      );
    }
    
    if (error.name === 'NoSuchKey' || error.code === 'NoSuchKey' || error.name === 'NotFound') {
      return new WikiError(
        'BUCKET_NOT_FOUND' as ErrorCodes,
        'The requested resource was not found.',
        error
      );
    }
    
    // Conflict errors
    if (error.name === 'PreconditionFailed' || error.code === 'PreconditionFailed') {
      return new WikiError(
        'EDIT_CONFLICT' as ErrorCodes,
        'The resource has been modified by another user. Please refresh and try again.',
        error
      );
    }
    
    // Network and connectivity errors
    if (error.name === 'NetworkingError' || error.code === 'NetworkingError' || 
        error.name === 'TimeoutError' || error.code === 'TimeoutError' ||
        error.name === 'NetworkError' || error.code === 'NetworkError') {
      return new WikiError(
        'NETWORK_ERROR' as ErrorCodes,
        'Network error occurred while accessing S3. Please check your internet connection and try again.',
        error
      );
    }
    
    // Browser-specific CORS errors
    if (error.name === 'CORSError' || error.code === 'CORSError' ||
        (error.message && (error.message.includes('CORS') || error.message.includes('Cross-Origin')))) {
      return new WikiError(
        'NETWORK_ERROR' as ErrorCodes,
        'Cross-origin request blocked. Please ensure your S3 bucket has proper CORS configuration for your domain.',
        error
      );
    }
    
    // Fetch API errors (browser-specific)
    if (error.name === 'TypeError' && error.message && error.message.includes('fetch')) {
      return new WikiError(
        'NETWORK_ERROR' as ErrorCodes,
        'Network request failed. Please check your internet connection and try again.',
        error
      );
    }
    
    if (error.name === 'UnknownEndpoint' || error.code === 'UnknownEndpoint') {
      return new WikiError(
        'NETWORK_ERROR' as ErrorCodes,
        `Invalid AWS region "${this.config.region}". Please check your region configuration.`,
        error
      );
    }
    
    // Request validation errors
    if (error.name === 'InvalidRequest' || error.code === 'InvalidRequest') {
      return new WikiError(
        'INVALID_FILE_TYPE' as ErrorCodes,
        'Invalid request. Please check your input and try again.',
        error
      );
    }
    
    if (error.name === 'EntityTooLarge' || error.code === 'EntityTooLarge') {
      return new WikiError(
        'FILE_TOO_LARGE' as ErrorCodes,
        `File is too large. Maximum allowed size is ${APP_CONFIG.maxFileSize / (1024 * 1024)}MB.`,
        error
      );
    }
    
    // Service errors
    if (error.name === 'ServiceUnavailable' || error.code === 'ServiceUnavailable' ||
        error.name === 'SlowDown' || error.code === 'SlowDown') {
      return new WikiError(
        'NETWORK_ERROR' as ErrorCodes,
        'AWS S3 service is temporarily unavailable. Please try again later.',
        error
      );
    }
    
    if (error.name === 'InternalError' || error.code === 'InternalError') {
      return new WikiError(
        'NETWORK_ERROR' as ErrorCodes,
        'AWS S3 internal error occurred. Please try again later.',
        error
      );
    }

    // Generic error
    return new WikiError(
      'NETWORK_ERROR' as ErrorCodes,
      error.message || 'An unexpected error occurred while accessing S3.',
      error
    );
  }
}

// Export singleton instance
export const s3Service = new S3Service();
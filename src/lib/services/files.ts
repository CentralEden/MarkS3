/**
 * File Service Implementation
 * Handles file upload, management, and reference tracking for the MarkS3 wiki system
 */

import type {
  FileService as IFileService,
  FileInfo,
  S3Service,
  WikiService
} from '../types/index.js';
import { WikiError, ErrorCodes } from '../types/index.js';
import { APP_CONFIG } from '../config/app.js';
import { s3Service } from './s3.js';
import { fileCache, prefetchService } from './cache.js';

/**
 * File Service implementation
 */
export class FileService implements IFileService {
  private s3Service: S3Service;
  private wikiService?: WikiService; // Optional to avoid circular dependency

  constructor(s3Service: S3Service) {
    this.s3Service = s3Service;
  }

  /**
   * Set wiki service for reference tracking (called after both services are initialized)
   */
  setWikiService(wikiService: WikiService): void {
    this.wikiService = wikiService;
  }

  /**
   * Upload a file to S3 with validation and metadata
   */
  async uploadFile(file: File): Promise<FileInfo> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique file path to avoid conflicts
      const timestamp = Date.now();
      const sanitizedName = this.sanitizeFilename(file.name);
      const filePath = `${timestamp}-${sanitizedName}`;

      // Upload to S3
      const s3Key = await this.s3Service.uploadFile(file, filePath);

      // Get file URL
      const url = await this.s3Service.getFileUrl(filePath);

      // Create FileInfo object
      const fileInfo: FileInfo = {
        id: filePath,
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        uploadedAt: new Date(),
        url
      };

      // Update file metadata index
      await this.updateFileMetadata('add', fileInfo);

      return fileInfo;
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a file from S3 and update metadata
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      // Check if file exists in metadata
      const files = await this.listFiles();
      const fileToDelete = files.find(f => f.id === fileId);
      
      if (!fileToDelete) {
        throw new WikiError(
          ErrorCodes.BUCKET_NOT_FOUND,
          `File not found: ${fileId}`
        );
      }

      // Delete from S3
      await this.s3Service.deleteFile(fileId);

      // Update file metadata index
      await this.updateFileMetadata('delete', fileToDelete);
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all pages that reference a specific file
   */
  async getFileReferences(fileId: string): Promise<string[]> {
    try {
      if (!this.wikiService) {
        throw new WikiError(
          ErrorCodes.CONFIG_ERROR,
          'Wiki service not initialized for file reference tracking'
        );
      }

      const referencingPages = await this.wikiService.getPagesReferencingFile(fileId);
      return referencingPages.map(page => page.path);
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to get file references: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List all uploaded files with metadata
   */
  async listFiles(): Promise<FileInfo[]> {
    try {
      // Try to get files from metadata index first
      const metadataFiles = await this.getFilesFromMetadata();
      
      if (metadataFiles.length > 0) {
        return metadataFiles;
      }

      // Fallback to S3 listing if metadata is empty
      return await this.s3Service.listFiles();
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a file is an image based on its content type or filename
   */
  isImageFile(filename: string): boolean {
    // Check by file extension
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    return imageExtensions.includes(extension);
  }

  /**
   * Find files that would become orphaned if a specific page is deleted
   */
  async findOrphanedFiles(deletedPagePath: string): Promise<FileInfo[]> {
    try {
      if (!this.wikiService) {
        throw new WikiError(
          ErrorCodes.CONFIG_ERROR,
          'Wiki service not initialized for orphaned file detection'
        );
      }

      // Get the page content to find referenced files
      const page = await this.wikiService.getPage(deletedPagePath);
      const allFiles = await this.listFiles();
      const allPages = await this.s3Service.listPages();
      
      const orphanedFiles: FileInfo[] = [];
      
      for (const file of allFiles) {
        if (this.isFileReferencedInContent(file, page.content)) {
          // Check if this file is referenced in any other page
          let referencedElsewhere = false;
          
          for (const otherPageMeta of allPages) {
            if (otherPageMeta.path !== deletedPagePath) {
              try {
                const otherPage = await this.wikiService.getPage(otherPageMeta.path);
                if (this.isFileReferencedInContent(file, otherPage.content)) {
                  referencedElsewhere = true;
                  break;
                }
              } catch (error) {
                // Skip pages that can't be loaded
                console.warn(`Failed to check file references in page ${otherPageMeta.path}:`, error);
              }
            }
          }
          
          if (!referencedElsewhere) {
            orphanedFiles.push(file);
          }
        }
      }
      
      return orphanedFiles;
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to find orphaned files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete multiple orphaned files
   */
  async deleteOrphanedFiles(fileIds: string[]): Promise<void> {
    try {
      const deletePromises = fileIds.map(fileId => this.deleteFile(fileId));
      await Promise.all(deletePromises);
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to delete orphaned files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get file information by ID
   */
  async getFileInfo(fileId: string): Promise<FileInfo | null> {
    try {
      const files = await this.listFiles();
      return files.find(f => f.id === fileId) || null;
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find all orphaned files in the system
   */
  async findAllOrphanedFiles(): Promise<FileInfo[]> {
    try {
      if (!this.wikiService) {
        throw new WikiError(
          ErrorCodes.CONFIG_ERROR,
          'Wiki service not initialized for orphaned file detection'
        );
      }

      const allFiles = await this.listFiles();
      const allPages = await this.s3Service.listPages();
      const orphanedFiles: FileInfo[] = [];

      for (const file of allFiles) {
        let isReferenced = false;

        // Check if file is referenced in any page
        for (const pageMeta of allPages) {
          try {
            const page = await this.wikiService.getPage(pageMeta.path);
            if (this.isFileReferencedInContent(file, page.content)) {
              isReferenced = true;
              break;
            }
          } catch (error) {
            console.warn(`Failed to check file references in page ${pageMeta.path}:`, error);
          }
        }

        if (!isReferenced) {
          orphanedFiles.push(file);
        }
      }

      return orphanedFiles;
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to find all orphaned files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get file usage statistics
   */
  async getFileUsageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    imageFiles: number;
    documentFiles: number;
    orphanedFiles: number;
  }> {
    try {
      const allFiles = await this.listFiles();
      const orphanedFiles = await this.findAllOrphanedFiles();
      
      let totalSize = 0;
      let imageFiles = 0;
      let documentFiles = 0;
      
      for (const file of allFiles) {
        totalSize += file.size;
        if (this.isImageFile(file.filename)) {
          imageFiles++;
        } else {
          documentFiles++;
        }
      }
      
      return {
        totalFiles: allFiles.length,
        totalSize,
        imageFiles,
        documentFiles,
        orphanedFiles: orphanedFiles.length
      };
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to get file usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Private helper methods

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    // Check file size
    if (file.size > APP_CONFIG.maxFileSize) {
      throw new WikiError(
        ErrorCodes.FILE_TOO_LARGE,
        `File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds maximum allowed size of ${APP_CONFIG.maxFileSize / (1024 * 1024)}MB.`
      );
    }

    // Check if file has a name
    if (!file.name || file.name.trim() === '') {
      throw new WikiError(
        ErrorCodes.INVALID_FILE_TYPE,
        'File must have a valid name'
      );
    }

    // Check for potentially dangerous file types (basic security)
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(extension)) {
      throw new WikiError(
        ErrorCodes.INVALID_FILE_TYPE,
        `File type ${extension} is not allowed for security reasons`
      );
    }
  }

  /**
   * Sanitize filename for safe storage
   */
  private sanitizeFilename(filename: string): string {
    // Remove or replace unsafe characters
    return filename
      .replace(/[<>:"|?*]/g, '_')  // Replace unsafe characters
      .replace(/\s+/g, '_')        // Replace spaces with underscores
      .replace(/_{2,}/g, '_')      // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '')     // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Check if a file is referenced in markdown content
   */
  private isFileReferencedInContent(file: FileInfo, content: string): boolean {
    // Look for markdown image syntax: ![alt](filename) or ![alt](url)
    // Look for markdown link syntax: [text](filename) or [text](url)
    const patterns = [
      new RegExp(`!\\[.*?\\]\\(.*?${this.escapeRegExp(file.filename)}.*?\\)`, 'gi'),
      new RegExp(`\\[.*?\\]\\(.*?${this.escapeRegExp(file.filename)}.*?\\)`, 'gi'),
      new RegExp(`!\\[.*?\\]\\(.*?${this.escapeRegExp(file.id)}.*?\\)`, 'gi'),
      new RegExp(`\\[.*?\\]\\(.*?${this.escapeRegExp(file.id)}.*?\\)`, 'gi'),
      // Also check for direct URL references
      new RegExp(this.escapeRegExp(file.url), 'gi')
    ];
    
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get files from metadata index
   */
  private async getFilesFromMetadata(): Promise<FileInfo[]> {
    try {
      const key = APP_CONFIG.s3Paths.metadata + 'files.json';
      const response = await this.s3Service.getPage(key.replace('.json', '.md'));
      
      // This is a workaround since we're using getPage - in a real implementation
      // we'd have a separate method for getting JSON metadata
      const metadata = JSON.parse(response.content);
      return metadata.files || [];
    } catch (error) {
      // Metadata file doesn't exist yet, return empty array
      return [];
    }
  }

  /**
   * Update file metadata index
   */
  private async updateFileMetadata(operation: 'add' | 'delete', fileInfo: FileInfo): Promise<void> {
    try {
      // Get current metadata
      let metadata: { files: FileInfo[]; version?: number } = { files: [], version: 1 };
      
      try {
        const currentFiles = await this.getFilesFromMetadata();
        metadata.files = currentFiles;
      } catch (error) {
        // Metadata doesn't exist yet, use empty array
      }

      // Apply operation
      switch (operation) {
        case 'add':
          // Remove existing entry if it exists, then add new one
          metadata.files = metadata.files.filter(f => f.id !== fileInfo.id);
          metadata.files.push(fileInfo);
          break;
        case 'delete':
          metadata.files = metadata.files.filter(f => f.id !== fileInfo.id);
          break;
      }

      // Increment version
      metadata.version = (metadata.version || 1) + 1;

      // Save updated metadata
      // Note: This is a simplified implementation. In a real system, we'd use
      // a proper JSON storage method with atomic updates
      const key = APP_CONFIG.s3Paths.metadata + 'files.json';
      await this.s3Service.savePage({
        path: key.replace('.json', '.md'),
        title: 'File Metadata',
        content: JSON.stringify(metadata, null, 2),
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'system',
          version: metadata.version
        }
      });
    } catch (error) {
      console.warn('Failed to update file metadata:', error);
      // Don't throw error here as the file operation itself succeeded
    }
  }
}

// Export singleton instance
export const fileService = new FileService(s3Service);

// Set up circular dependency after both services are created
// This will be called from the wiki service module
export function initializeFileService(wikiService: WikiService): void {
  fileService.setWikiService(wikiService);
}
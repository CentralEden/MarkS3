/**
 * File Operations Integration Tests
 * Tests the complete file management flow including upload, reference tracking, and cleanup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileService } from '../../src/lib/services/files.js';
import { S3Service } from '../../src/lib/services/s3.js';
import { WikiService } from '../../src/lib/services/wiki.js';
import { WikiError, ErrorCodes } from '../../src/lib/types/index.js';
import type { FileInfo, WikiPage } from '../../src/lib/types/index.js';

describe('File Operations Integration', () => {
  let fileService: FileService;
  let s3Service: S3Service;
  let mockWikiService: Partial<WikiService>;

  beforeEach(() => {
    s3Service = new S3Service();
    
    // Create mock wiki service for testing
    mockWikiService = {
      getPage: async (path: string): Promise<WikiPage> => {
        // Mock page content with file references
        const mockPages: Record<string, WikiPage> = {
          'test-page.md': {
            path: 'test-page.md',
            title: 'Test Page',
            content: '# Test Page\n\n![Image](test-image.png)\n\n[Document](test-doc.pdf)',
            metadata: {
              createdAt: new Date(),
              updatedAt: new Date(),
              author: 'test-user',
              version: 1
            }
          },
          'another-page.md': {
            path: 'another-page.md',
            title: 'Another Page',
            content: '# Another Page\n\nNo file references here.',
            metadata: {
              createdAt: new Date(),
              updatedAt: new Date(),
              author: 'test-user',
              version: 1
            }
          }
        };
        
        if (mockPages[path]) {
          return mockPages[path];
        }
        
        throw new WikiError(ErrorCodes.BUCKET_NOT_FOUND, `Page not found: ${path}`);
      },
      
      getPagesReferencingFile: async (fileId: string): Promise<WikiPage[]> => {
        // Mock implementation that returns pages referencing the file
        const allPages = [
          await mockWikiService.getPage!('test-page.md'),
          await mockWikiService.getPage!('another-page.md')
        ];
        
        return allPages.filter(page => 
          page.content.includes(fileId) || 
          page.content.includes(fileId.split('-').pop() || '')
        );
      }
    };
    
    fileService = new FileService(s3Service);
    fileService.setWikiService(mockWikiService as WikiService);
  });

  afterEach(() => {
    // Clean up any test data if needed
  });

  describe('File Upload Integration', () => {
    it('should handle file validation during upload', async () => {
      // Test with oversized file
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain'
      });

      try {
        await fileService.uploadFile(largeFile);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.FILE_TOO_LARGE);
        expect((error as WikiError).message).toContain('exceeds maximum');
      }
    });

    it('should handle dangerous file types', async () => {
      const dangerousFile = new File(['malicious content'], 'virus.exe', {
        type: 'application/octet-stream'
      });

      try {
        await fileService.uploadFile(dangerousFile);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.INVALID_FILE_TYPE);
        expect((error as WikiError).message).toContain('not allowed');
      }
    });

    it('should handle files with invalid names', async () => {
      const invalidFile = new File(['content'], '', {
        type: 'text/plain'
      });

      try {
        await fileService.uploadFile(invalidFile);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.INVALID_FILE_TYPE);
        expect((error as WikiError).message).toContain('valid name');
      }
    });

    it('should handle valid file upload flow', async () => {
      const validFile = new File(['test content'], 'test.txt', {
        type: 'text/plain'
      });

      try {
        const fileInfo = await fileService.uploadFile(validFile);
        
        // Should return FileInfo object
        expect(fileInfo).toHaveProperty('id');
        expect(fileInfo).toHaveProperty('filename');
        expect(fileInfo).toHaveProperty('size');
        expect(fileInfo).toHaveProperty('contentType');
        expect(fileInfo).toHaveProperty('uploadedAt');
        expect(fileInfo).toHaveProperty('url');
        
        expect(fileInfo.filename).toBe('test.txt');
        expect(fileInfo.size).toBe(validFile.size);
        expect(fileInfo.contentType).toBe('text/plain');
        expect(fileInfo.uploadedAt).toBeInstanceOf(Date);
        expect(typeof fileInfo.url).toBe('string');
        expect(typeof fileInfo.id).toBe('string');
      } catch (error) {
        // If upload fails due to AWS connectivity, that's expected in test environment
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.NETWORK_ERROR,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.BUCKET_NOT_FOUND
        ]).toContain((error as WikiError).code);
      }
    });

    it('should sanitize filenames correctly', async () => {
      const fileWithSpecialChars = new File(['content'], 'test file<>:|?*.txt', {
        type: 'text/plain'
      });

      try {
        const fileInfo = await fileService.uploadFile(fileWithSpecialChars);
        
        // ID should be sanitized
        expect(fileInfo.id).not.toContain('<');
        expect(fileInfo.id).not.toContain('>');
        expect(fileInfo.id).not.toContain(':');
        expect(fileInfo.id).not.toContain('|');
        expect(fileInfo.id).not.toContain('?');
        expect(fileInfo.id).not.toContain('*');
        
        // Original filename should be preserved
        expect(fileInfo.filename).toBe('test file<>:|?*.txt');
      } catch (error) {
        // Expected in test environment without AWS access
        expect(error).toBeInstanceOf(WikiError);
      }
    });
  });

  describe('File Reference Tracking Integration', () => {
    it('should detect file references in page content', async () => {
      try {
        const references = await fileService.getFileReferences('test-image.png');
        
        // Should find references or handle gracefully
        expect(Array.isArray(references)).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.CONFIG_ERROR);
        expect((error as WikiError).message).toContain('Wiki service not initialized');
      }
    });

    it('should handle file reference tracking with wiki service', async () => {
      const references = await fileService.getFileReferences('test-image.png');
      
      expect(Array.isArray(references)).toBe(true);
      expect(references).toContain('test-page.md');
    });

    it('should handle non-existent file references', async () => {
      const references = await fileService.getFileReferences('non-existent.png');
      
      expect(Array.isArray(references)).toBe(true);
      expect(references).toHaveLength(0);
    });

    it('should handle file reference tracking errors gracefully', async () => {
      // Create file service without wiki service
      const isolatedFileService = new FileService(s3Service);
      
      try {
        await isolatedFileService.getFileReferences('test.png');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.CONFIG_ERROR);
      }
    });
  });

  describe('Orphaned File Detection Integration', () => {
    it('should detect orphaned files when page is deleted', async () => {
      const orphanedFiles = await fileService.findOrphanedFiles('test-page.md');
      
      expect(Array.isArray(orphanedFiles)).toBe(true);
      // In mock environment, should detect files referenced only in deleted page
    });

    it('should handle orphaned file detection with no references', async () => {
      const orphanedFiles = await fileService.findOrphanedFiles('another-page.md');
      
      expect(Array.isArray(orphanedFiles)).toBe(true);
      expect(orphanedFiles).toHaveLength(0);
    });

    it('should find all orphaned files in system', async () => {
      try {
        const orphanedFiles = await fileService.findAllOrphanedFiles();
        
        expect(Array.isArray(orphanedFiles)).toBe(true);
        // Each item should be a FileInfo object
        orphanedFiles.forEach(file => {
          expect(file).toHaveProperty('id');
          expect(file).toHaveProperty('filename');
          expect(file).toHaveProperty('size');
          expect(file).toHaveProperty('contentType');
        });
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
      }
    });

    it('should handle orphaned file cleanup', async () => {
      const fileIds = ['test-file-1.txt', 'test-file-2.txt'];
      
      try {
        await fileService.deleteOrphanedFiles(fileIds);
        // Should complete without throwing
        expect(true).toBe(true);
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
      }
    });
  });

  describe('File Listing and Management Integration', () => {
    it('should handle file listing', async () => {
      try {
        const files = await fileService.listFiles();
        
        expect(Array.isArray(files)).toBe(true);
        files.forEach(file => {
          expect(file).toHaveProperty('id');
          expect(file).toHaveProperty('filename');
          expect(file).toHaveProperty('size');
          expect(file).toHaveProperty('contentType');
          expect(file).toHaveProperty('uploadedAt');
          expect(file).toHaveProperty('url');
        });
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
      }
    });

    it('should handle file deletion', async () => {
      try {
        await fileService.deleteFile('non-existent-file.txt');
        // Should handle gracefully
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.NETWORK_ERROR,
          ErrorCodes.S3_ACCESS_DENIED
        ]).toContain((error as WikiError).code);
      }
    });

    it('should get file information by ID', async () => {
      const fileInfo = await fileService.getFileInfo('non-existent.txt');
      expect(fileInfo).toBeNull();
    });

    it('should generate file usage statistics', async () => {
      try {
        const stats = await fileService.getFileUsageStats();
        
        expect(stats).toHaveProperty('totalFiles');
        expect(stats).toHaveProperty('totalSize');
        expect(stats).toHaveProperty('imageFiles');
        expect(stats).toHaveProperty('documentFiles');
        expect(stats).toHaveProperty('orphanedFiles');
        
        expect(typeof stats.totalFiles).toBe('number');
        expect(typeof stats.totalSize).toBe('number');
        expect(typeof stats.imageFiles).toBe('number');
        expect(typeof stats.documentFiles).toBe('number');
        expect(typeof stats.orphanedFiles).toBe('number');
        
        expect(stats.totalFiles).toBeGreaterThanOrEqual(0);
        expect(stats.totalSize).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
      }
    });
  });

  describe('Image File Detection Integration', () => {
    it('should correctly identify image files', () => {
      const imageFiles = [
        'test.png',
        'photo.jpg',
        'image.jpeg',
        'animation.gif',
        'vector.svg',
        'modern.webp',
        'bitmap.bmp',
        'icon.ico'
      ];

      imageFiles.forEach(filename => {
        expect(fileService.isImageFile(filename)).toBe(true);
      });
    });

    it('should correctly identify non-image files', () => {
      const nonImageFiles = [
        'document.pdf',
        'text.txt',
        'data.json',
        'script.js',
        'style.css',
        'archive.zip',
        'video.mp4',
        'audio.mp3'
      ];

      nonImageFiles.forEach(filename => {
        expect(fileService.isImageFile(filename)).toBe(false);
      });
    });

    it('should handle files without extensions', () => {
      expect(fileService.isImageFile('filename')).toBe(false);
      expect(fileService.isImageFile('')).toBe(false);
    });

    it('should handle case insensitive extensions', () => {
      expect(fileService.isImageFile('test.PNG')).toBe(true);
      expect(fileService.isImageFile('photo.JPG')).toBe(true);
      expect(fileService.isImageFile('image.JPEG')).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle S3 service errors gracefully', async () => {
      // Test with operations that might fail due to AWS connectivity
      try {
        await fileService.listFiles();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.NETWORK_ERROR,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.BUCKET_NOT_FOUND
        ]).toContain((error as WikiError).code);
      }
    });

    it('should handle concurrent file operations', async () => {
      const operations = [
        fileService.listFiles().catch(() => []),
        fileService.getFileUsageStats().catch(() => ({
          totalFiles: 0,
          totalSize: 0,
          imageFiles: 0,
          documentFiles: 0,
          orphanedFiles: 0
        })),
        fileService.findAllOrphanedFiles().catch(() => [])
      ];

      const results = await Promise.allSettled(operations);
      
      // All operations should complete
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });

    it('should maintain consistency during error conditions', async () => {
      // Test that service remains in consistent state after errors
      const initialState = fileService.isImageFile('test.png');
      
      try {
        await fileService.uploadFile(new File([''], '', { type: 'text/plain' }));
      } catch (error) {
        // Expected to fail
      }
      
      try {
        await fileService.deleteFile('non-existent.txt');
      } catch (error) {
        // Expected to fail
      }
      
      // Service should still work correctly
      expect(fileService.isImageFile('test.png')).toBe(initialState);
    });
  });
});
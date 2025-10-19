/**
 * File Service Tests
 * Tests for file upload, management, and reference tracking functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileService } from './files.js';
import { WikiError, ErrorCodes } from '../types/index.js';
import type { S3Service, WikiService, FileInfo } from '../types/index.js';

// Mock S3 Service
const mockS3Service: S3Service = {
  getPage: vi.fn(),
  savePage: vi.fn(),
  deletePage: vi.fn(),
  listPages: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  listFiles: vi.fn(),
  getFileUrl: vi.fn(),
  getConfig: vi.fn(),
  saveConfig: vi.fn(),
  updateMetadata: vi.fn()
};

// Mock Wiki Service
const mockWikiService: WikiService = {
  createPage: vi.fn(),
  updatePage: vi.fn(),
  getPage: vi.fn(),
  deletePage: vi.fn(),
  searchPages: vi.fn(),
  getPageHierarchy: vi.fn(),
  getPageAttachments: vi.fn(),
  searchPagesInFolder: vi.fn(),
  getPagesByTag: vi.fn(),
  getAllTags: vi.fn(),
  findAllOrphanedFiles: vi.fn(),
  deleteOrphanedFiles: vi.fn(),
  getPagesReferencingFile: vi.fn(),
  validatePageDeletion: vi.fn()
};

describe('FileService', () => {
  let fileService: FileService;

  beforeEach(() => {
    vi.clearAllMocks();
    fileService = new FileService(mockS3Service);
    fileService.setWikiService(mockWikiService);
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain'
      });

      vi.mocked(mockS3Service.uploadFile).mockResolvedValue('test-key');
      vi.mocked(mockS3Service.getFileUrl).mockResolvedValue('https://example.com/test.txt');
      vi.mocked(mockS3Service.savePage).mockResolvedValue({
        success: true,
        etag: 'test-etag'
      });

      const result = await fileService.uploadFile(mockFile);

      expect(result.filename).toBe('test.txt');
      expect(result.contentType).toBe('text/plain');
      expect(result.url).toBe('https://example.com/test.txt');
      expect(mockS3Service.uploadFile).toHaveBeenCalled();
    });

    it('should reject files that are too large', async () => {
      // Create a mock file that exceeds the size limit (10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain'
      });

      await expect(fileService.uploadFile(largeFile))
        .rejects
        .toThrow(WikiError);
    });

    it('should reject dangerous file types', async () => {
      const dangerousFile = new File(['malicious content'], 'virus.exe', {
        type: 'application/octet-stream'
      });

      await expect(fileService.uploadFile(dangerousFile))
        .rejects
        .toThrow(WikiError);
    });

    it('should sanitize filenames', async () => {
      const fileWithSpecialChars = new File(['content'], 'file with spaces & chars.txt', {
        type: 'text/plain'
      });

      vi.mocked(mockS3Service.uploadFile).mockResolvedValue('test-key');
      vi.mocked(mockS3Service.getFileUrl).mockResolvedValue('https://example.com/test.txt');
      vi.mocked(mockS3Service.savePage).mockResolvedValue({
        success: true,
        etag: 'test-etag'
      });

      const result = await fileService.uploadFile(fileWithSpecialChars);

      // The ID should be sanitized but filename should remain original
      expect(result.filename).toBe('file with spaces & chars.txt');
      expect(result.id).toMatch(/^\d+-file_with_spaces_&_chars\.txt$/);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const fileId = 'test-file.txt';
      const mockFiles: FileInfo[] = [
        {
          id: fileId,
          filename: 'test-file.txt',
          size: 1024,
          contentType: 'text/plain',
          uploadedAt: new Date(),
          url: 'https://example.com/test-file.txt'
        }
      ];

      vi.mocked(mockS3Service.listFiles).mockResolvedValue(mockFiles);
      vi.mocked(mockS3Service.deleteFile).mockResolvedValue();
      vi.mocked(mockS3Service.savePage).mockResolvedValue({
        success: true,
        etag: 'test-etag'
      });

      await fileService.deleteFile(fileId);

      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(fileId);
    });

    it('should throw error if file not found', async () => {
      const fileId = 'nonexistent-file.txt';

      vi.mocked(mockS3Service.listFiles).mockResolvedValue([]);

      await expect(fileService.deleteFile(fileId))
        .rejects
        .toThrow(WikiError);
    });
  });

  describe('isImageFile', () => {
    it('should correctly identify image files', () => {
      const imageFiles = [
        'image.png',
        'photo.jpg',
        'picture.jpeg',
        'animation.gif',
        'vector.svg',
        'modern.webp'
      ];

      const nonImageFiles = [
        'document.pdf',
        'text.txt',
        'data.json',
        'script.js'
      ];

      imageFiles.forEach(filename => {
        expect(fileService.isImageFile(filename)).toBe(true);
      });

      nonImageFiles.forEach(filename => {
        expect(fileService.isImageFile(filename)).toBe(false);
      });
    });
  });

  describe('getFileReferences', () => {
    it('should get pages that reference a file', async () => {
      const fileId = 'test-image.png';
      const mockReferencingPages = [
        {
          path: 'page1.md',
          title: 'Page 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      ];

      vi.mocked(mockWikiService.getPagesReferencingFile).mockResolvedValue(mockReferencingPages);

      const result = await fileService.getFileReferences(fileId);

      expect(result).toEqual(['page1.md']);
      expect(mockWikiService.getPagesReferencingFile).toHaveBeenCalledWith(fileId);
    });

    it('should throw error if wiki service not initialized', async () => {
      const fileServiceWithoutWiki = new FileService(mockS3Service);
      
      await expect(fileServiceWithoutWiki.getFileReferences('test.png'))
        .rejects
        .toThrow(WikiError);
    });
  });

  describe('findOrphanedFiles', () => {
    it('should find files that would become orphaned', async () => {
      const deletedPagePath = 'test-page.md';
      const mockPage = {
        path: deletedPagePath,
        title: 'Test Page',
        content: 'Content with ![image](orphaned.png) and ![shared](shared.png)',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: 1
        }
      };

      const mockFiles: FileInfo[] = [
        {
          id: 'orphaned.png',
          filename: 'orphaned.png',
          size: 1024,
          contentType: 'image/png',
          uploadedAt: new Date(),
          url: 'https://example.com/orphaned.png'
        },
        {
          id: 'shared.png',
          filename: 'shared.png',
          size: 2048,
          contentType: 'image/png',
          uploadedAt: new Date(),
          url: 'https://example.com/shared.png'
        }
      ];

      const mockOtherPages = [
        {
          path: 'other-page.md',
          title: 'Other Page',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      ];

      const mockOtherPageContent = {
        path: 'other-page.md',
        title: 'Other Page',
        content: 'Content with ![shared](shared.png)',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: 1
        }
      };

      vi.mocked(mockWikiService.getPage)
        .mockResolvedValueOnce(mockPage)
        .mockResolvedValue(mockOtherPageContent);
      vi.mocked(mockS3Service.listFiles).mockResolvedValue(mockFiles);
      vi.mocked(mockS3Service.listPages).mockResolvedValue(mockOtherPages);

      const result = await fileService.findOrphanedFiles(deletedPagePath);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('orphaned.png');
    });
  });

  describe('getFileUsageStats', () => {
    it('should return correct file usage statistics', async () => {
      const mockFiles: FileInfo[] = [
        {
          id: 'image1.png',
          filename: 'image1.png',
          size: 1024,
          contentType: 'image/png',
          uploadedAt: new Date(),
          url: 'https://example.com/image1.png'
        },
        {
          id: 'document.pdf',
          filename: 'document.pdf',
          size: 2048,
          contentType: 'application/pdf',
          uploadedAt: new Date(),
          url: 'https://example.com/document.pdf'
        }
      ];

      const mockOrphanedFiles: FileInfo[] = [mockFiles[1]]; // document.pdf is orphaned

      // Mock the listFiles call
      vi.mocked(mockS3Service.listFiles).mockResolvedValue(mockFiles);
      
      // Mock the findAllOrphanedFiles to return the expected orphaned files
      vi.spyOn(fileService, 'findAllOrphanedFiles').mockResolvedValue(mockOrphanedFiles);

      const stats = await fileService.getFileUsageStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBe(3072);
      expect(stats.imageFiles).toBe(1);
      expect(stats.documentFiles).toBe(1);
      expect(stats.orphanedFiles).toBe(1);
    });
  });
});
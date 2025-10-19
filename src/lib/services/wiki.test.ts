/**
 * Wiki Service Tests
 * Tests for core wiki functionality including page management and search
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WikiService } from './wiki.js';
import { WikiError, ErrorCodes } from '../types/index.js';
import type { S3Service, WikiPage, WikiPageMeta } from '../types/index.js';

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

describe('WikiService', () => {
  let wikiService: WikiService;

  beforeEach(() => {
    vi.clearAllMocks();
    wikiService = new WikiService(mockS3Service);
  });

  describe('createPage', () => {
    it('should create a new page successfully', async () => {
      const path = 'test-page.md';
      const content = '# Test Page\n\nThis is a test page.';
      
      // Mock that page doesn't exist
      vi.mocked(mockS3Service.getPage).mockRejectedValue(
        new WikiError(ErrorCodes.BUCKET_NOT_FOUND, 'Page not found')
      );
      
      // Mock successful save
      vi.mocked(mockS3Service.savePage).mockResolvedValue({
        success: true,
        etag: 'test-etag'
      });

      const result = await wikiService.createPage(path, content);

      expect(result.path).toBe(path);
      expect(result.title).toBe('Test Page');
      expect(result.content).toBe(content);
      expect(result.etag).toBe('test-etag');
      expect(result.metadata.version).toBe(1);
    });

    it('should throw error if page already exists', async () => {
      const path = 'existing-page.md';
      const content = '# Existing Page';
      
      // Mock that page exists
      vi.mocked(mockS3Service.getPage).mockResolvedValue({
        path,
        title: 'Existing Page',
        content: 'Old content',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: 1
        }
      });

      await expect(wikiService.createPage(path, content))
        .rejects
        .toThrow(WikiError);
    });

    it('should validate page path format', async () => {
      const invalidPaths = [
        '',
        'no-extension',
        'invalid<chars>.md',
        '../relative.md'
      ];

      for (const path of invalidPaths) {
        await expect(wikiService.createPage(path, 'content'))
          .rejects
          .toThrow(WikiError);
      }
    });
  });

  describe('updatePage', () => {
    it('should update existing page successfully', async () => {
      const path = 'test-page.md';
      const newContent = '# Updated Page\n\nThis is updated content.';
      
      const existingPage: WikiPage = {
        path,
        title: 'Test Page',
        content: 'Old content',
        metadata: {
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          author: 'test',
          version: 1
        },
        etag: 'old-etag'
      };

      vi.mocked(mockS3Service.getPage).mockResolvedValue(existingPage);
      vi.mocked(mockS3Service.savePage).mockResolvedValue({
        success: true,
        etag: 'new-etag'
      });

      const result = await wikiService.updatePage(path, newContent);

      expect(result.title).toBe('Updated Page');
      expect(result.content).toBe(newContent);
      expect(result.metadata.version).toBe(2);
      expect(result.etag).toBe('new-etag');
    });

    it('should handle edit conflicts', async () => {
      const path = 'test-page.md';
      const content = 'New content';
      
      const existingPage: WikiPage = {
        path,
        title: 'Test Page',
        content: 'Old content',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: 1
        },
        etag: 'old-etag'
      };

      vi.mocked(mockS3Service.getPage).mockResolvedValue(existingPage);
      vi.mocked(mockS3Service.savePage).mockResolvedValue({
        success: false,
        etag: 'conflict-etag',
        conflict: true,
        conflictData: existingPage
      });

      await expect(wikiService.updatePage(path, content))
        .rejects
        .toThrow(WikiError);
    });
  });

  describe('searchPages', () => {
    it('should return empty array for empty query', async () => {
      const result = await wikiService.searchPages('');
      expect(result).toEqual([]);
    });

    it('should search pages by title with priority', async () => {
      const mockPages: WikiPageMeta[] = [
        {
          path: 'content-match.md',
          title: 'Some Page',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          author: 'test'
        },
        {
          path: 'title-match.md',
          title: 'Test Page',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          author: 'test'
        }
      ];

      vi.mocked(mockS3Service.listPages).mockResolvedValue(mockPages);
      
      // Mock content search for the first page
      vi.mocked(mockS3Service.getPage).mockImplementation(async (path) => {
        if (path === 'content-match.md') {
          return {
            path,
            title: 'Some Page',
            content: 'This content contains test keyword',
            metadata: {
              createdAt: new Date(),
              updatedAt: new Date(),
              author: 'test',
              version: 1
            }
          };
        }
        throw new Error('Page not found');
      });

      const results = await wikiService.searchPages('test');

      // Title matches should come first
      expect(results[0].path).toBe('title-match.md');
      expect(results[1].path).toBe('content-match.md');
    });
  });

  describe('getPageHierarchy', () => {
    it('should build correct hierarchy from flat page list', async () => {
      const mockPages: WikiPageMeta[] = [
        {
          path: 'index.md',
          title: 'Home',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        },
        {
          path: 'folder/page1.md',
          title: 'Page 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        },
        {
          path: 'folder/subfolder/page2.md',
          title: 'Page 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      ];

      vi.mocked(mockS3Service.listPages).mockResolvedValue(mockPages);

      const hierarchy = await wikiService.getPageHierarchy();

      expect(hierarchy).toHaveLength(2); // index.md and folder/
      
      // Find the folder node
      const folderNode = hierarchy.find(node => node.path === 'folder');
      expect(folderNode).toBeDefined();
      expect(folderNode?.isFolder).toBe(true);
      expect(folderNode?.children).toHaveLength(2); // page1.md and subfolder/
    });
  });

  describe('deletePage', () => {
    it('should delete page and return orphaned files info', async () => {
      const path = 'test-page.md';
      
      const mockPage: WikiPage = {
        path,
        title: 'Test Page',
        content: 'Content with ![image](test.png)',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: 1
        }
      };

      vi.mocked(mockS3Service.getPage).mockResolvedValue(mockPage);
      vi.mocked(mockS3Service.deletePage).mockResolvedValue();
      vi.mocked(mockS3Service.updateMetadata).mockResolvedValue();
      vi.mocked(mockS3Service.listFiles).mockResolvedValue([]);
      vi.mocked(mockS3Service.listPages).mockResolvedValue([]);

      const result = await wikiService.deletePage(path);

      expect(result.deletedPage).toBe(path);
      expect(mockS3Service.deletePage).toHaveBeenCalledWith(path);
      expect(mockS3Service.updateMetadata).toHaveBeenCalled();
    });
  });
});
/**
 * Formatting Utilities Tests
 * Tests for text formatting and utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  formatDate,
  extractTitleFromMarkdown,
  generatePagePath,
  getBreadcrumbs
} from './formatting.js';

describe('Formatting Utilities', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });

    it('should handle large numbers', () => {
      expect(formatFileSize(5368709120)).toBe('5 GB');
    });
  });

  describe('formatDate', () => {
    it('should format date in Japanese locale', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      
      // Check that it contains expected components
      expect(formatted).toMatch(/2024/);
      expect(formatted).toMatch(/01/);
      expect(formatted).toMatch(/15/);
    });

    it('should handle different dates', () => {
      const date1 = new Date('2023-12-31T23:59:59Z');
      const date2 = new Date('2024-06-15T12:00:00Z');
      
      const formatted1 = formatDate(date1);
      const formatted2 = formatDate(date2);
      
      // Just check that they are different and contain expected components
      expect(formatted1).not.toBe(formatted2);
      expect(formatted1).toMatch(/\d{4}/); // Contains year
      expect(formatted2).toMatch(/\d{4}/); // Contains year
    });
  });

  describe('extractTitleFromMarkdown', () => {
    it('should extract H1 title', () => {
      const content = '# Main Title\n\nSome content here.';
      expect(extractTitleFromMarkdown(content)).toBe('Main Title');
    });

    it('should extract H2 title if no H1', () => {
      const content = 'Some intro text\n\n## Secondary Title\n\nMore content.';
      expect(extractTitleFromMarkdown(content)).toBe('Secondary Title');
    });

    it('should use first line if no headings', () => {
      const content = 'First line of content\nSecond line\nThird line';
      expect(extractTitleFromMarkdown(content)).toBe('First line of content');
    });

    it('should return "Untitled" for empty content', () => {
      expect(extractTitleFromMarkdown('')).toBe('Untitled');
      expect(extractTitleFromMarkdown('   ')).toBe('Untitled');
    });

    it('should handle complex markdown', () => {
      const content = `
Some intro text

# Main Title with **bold** and *italic*

## Subtitle

Content here.
      `.trim();
      
      expect(extractTitleFromMarkdown(content)).toBe('Main Title with **bold** and *italic*');
    });

    it('should trim whitespace from titles', () => {
      const content = '#   Spaced Title   \n\nContent';
      expect(extractTitleFromMarkdown(content)).toBe('Spaced Title');
    });
  });

  describe('generatePagePath', () => {
    it('should generate kebab-case path from title', () => {
      expect(generatePagePath('My New Page')).toBe('my-new-page.md');
      expect(generatePagePath('Another Test Page')).toBe('another-test-page.md');
    });

    it('should handle special characters', () => {
      expect(generatePagePath('Page with Special! Characters@')).toBe('page-with-special-characters.md');
      // The function removes special chars and may leave trailing hyphens
      const result = generatePagePath('Numbers 123 and Symbols #$%');
      expect(result).toMatch(/^numbers-123-and-symbols-?\.md$/);
    });

    it('should handle parent path', () => {
      expect(generatePagePath('Child Page', 'parent')).toBe('parent/child-page.md');
      expect(generatePagePath('Deep Page', 'folder/subfolder')).toBe('folder/subfolder/deep-page.md');
    });

    it('should handle root parent path', () => {
      expect(generatePagePath('Root Page', '/')).toBe('root-page.md');
    });

    it('should remove trailing slashes from parent path', () => {
      expect(generatePagePath('Test Page', 'parent/')).toBe('parent/test-page.md');
    });

    it('should handle multiple consecutive spaces and hyphens', () => {
      expect(generatePagePath('Multiple   Spaces')).toBe('multiple-spaces.md');
      expect(generatePagePath('Multiple---Hyphens')).toBe('multiple-hyphens.md');
    });
  });

  describe('getBreadcrumbs', () => {
    it('should generate breadcrumbs for simple path', () => {
      const breadcrumbs = getBreadcrumbs('page.md');
      expect(breadcrumbs).toEqual([
        { name: 'Page', path: 'page.md' }
      ]);
    });

    it('should generate breadcrumbs for nested path', () => {
      const breadcrumbs = getBreadcrumbs('folder/subfolder/page.md');
      expect(breadcrumbs).toEqual([
        { name: 'Folder', path: 'folder.md' },
        { name: 'Subfolder', path: 'folder/subfolder.md' },
        { name: 'Page', path: 'folder/subfolder/page.md' }
      ]);
    });

    it('should handle kebab-case names', () => {
      const breadcrumbs = getBreadcrumbs('my-folder/my-page.md');
      expect(breadcrumbs).toEqual([
        { name: 'My Folder', path: 'my-folder.md' },
        { name: 'My Page', path: 'my-folder/my-page.md' }
      ]);
    });

    it('should handle empty or root paths', () => {
      expect(getBreadcrumbs('.md')).toEqual([]);
      expect(getBreadcrumbs('/')).toEqual([]);
    });

    it('should capitalize words properly', () => {
      const breadcrumbs = getBreadcrumbs('technical-docs/api-reference.md');
      expect(breadcrumbs).toEqual([
        { name: 'Technical Docs', path: 'technical-docs.md' },
        { name: 'Api Reference', path: 'technical-docs/api-reference.md' }
      ]);
    });
  });
});
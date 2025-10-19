/**
 * Validation Utilities Tests
 * Tests for input validation and sanitization functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateFileSize,
  isImageFile,
  validatePagePath,
  validatePageTitle,
  sanitizeFilename,
  generateUniqueFilename
} from './validation.js';

describe('Validation Utilities', () => {
  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const smallFile = new File(['small content'], 'small.txt', {
        type: 'text/plain'
      });
      
      expect(validateFileSize(smallFile)).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      // Create a file larger than 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain'
      });
      
      expect(validateFileSize(largeFile)).toBe(false);
    });
  });

  describe('isImageFile', () => {
    it('should identify image files correctly', () => {
      const imageFile = new File(['image data'], 'image.png', {
        type: 'image/png'
      });
      
      const textFile = new File(['text content'], 'text.txt', {
        type: 'text/plain'
      });
      
      expect(isImageFile(imageFile)).toBe(true);
      expect(isImageFile(textFile)).toBe(false);
    });
  });

  describe('validatePagePath', () => {
    it('should accept valid page paths', () => {
      const validPaths = [
        'index.md',
        'folder/page.md',
        'deep/nested/folder/page.md',
        'page-with-dashes.md',
        'page_with_underscores.md'
      ];

      validPaths.forEach(path => {
        expect(validatePagePath(path)).toBe(true);
      });
    });

    it('should reject invalid page paths', () => {
      const invalidPaths = [
        '',
        '   ',
        'no-extension',
        'invalid<chars>.md',
        'invalid>chars.md',
        'invalid:chars.md',
        'invalid"chars.md',
        'invalid|chars.md',
        'invalid?chars.md',
        'invalid*chars.md',
        '../relative.md',
        '/absolute.md'
      ];

      invalidPaths.forEach(path => {
        expect(validatePagePath(path)).toBe(false);
      });
    });
  });

  describe('validatePageTitle', () => {
    it('should accept valid page titles', () => {
      const validTitles = [
        'Simple Title',
        'Title with Numbers 123',
        'Title with Special Characters: & - _',
        'A'.repeat(200) // Exactly 200 characters
      ];

      validTitles.forEach(title => {
        expect(validatePageTitle(title)).toBe(true);
      });
    });

    it('should reject invalid page titles', () => {
      const invalidTitles = [
        '',
        '   ',
        'A'.repeat(201), // Too long
        null as any,
        undefined as any
      ];

      invalidTitles.forEach(title => {
        expect(validatePageTitle(title)).toBe(false);
      });
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize filenames by replacing invalid characters', () => {
      const testCases = [
        { input: 'normal-file.txt', expected: 'normal-file.txt' },
        { input: 'file<with>invalid:chars.txt', expected: 'file_with_invalid_chars.txt' },
        { input: 'file"with|more?invalid*chars.txt', expected: 'file_with_more_invalid_chars.txt' },
        { input: 'file with spaces.txt', expected: 'file with spaces.txt' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeFilename(input)).toBe(expected);
      });
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filenames with timestamp', () => {
      const originalName = 'test-file.txt';
      const uniqueName = generateUniqueFilename(originalName);
      
      expect(uniqueName).toMatch(/^test-file_\d+\.txt$/);
      expect(uniqueName).not.toBe(originalName);
    });

    it('should handle files without extensions', () => {
      const originalName = 'test-file';
      const uniqueName = generateUniqueFilename(originalName);
      
      expect(uniqueName).toMatch(/^test-file_\d+\.test-file$/);
    });

    it('should sanitize the base filename', () => {
      const originalName = 'file<with>invalid:chars.txt';
      const uniqueName = generateUniqueFilename(originalName);
      
      expect(uniqueName).toMatch(/^file_with_invalid_chars_\d+\.txt$/);
    });

    it('should generate different names for multiple calls', async () => {
      const originalName = 'test.txt';
      const name1 = generateUniqueFilename(originalName);
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      const name2 = generateUniqueFilename(originalName);
      
      expect(name1).not.toBe(name2);
    });
  });
});
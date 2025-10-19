/**
 * S3 Service Tests
 * Basic tests for the S3 service functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S3Service } from './s3.js';
import { WikiError, ErrorCodes } from '../types/index.js';

describe('S3Service', () => {
  let s3Service: S3Service;

  beforeEach(() => {
    s3Service = new S3Service();
  });

  describe('Error Handling', () => {
    it('should handle non-retryable errors correctly', () => {
      const nonRetryableErrors = [
        'AccessDenied',
        'NoSuchBucket',
        'NoSuchKey',
        'NotFound',
        'PreconditionFailed',
        'InvalidRequest'
      ];

      nonRetryableErrors.forEach(errorName => {
        const isNonRetryable = (s3Service as any).isNonRetryableError({ name: errorName });
        expect(isNonRetryable).toBe(true);
      });
    });

    it('should identify retryable errors correctly', () => {
      const retryableErrors = [
        'NetworkingError',
        'TimeoutError',
        'ServiceUnavailable',
        'InternalError'
      ];

      retryableErrors.forEach(errorName => {
        const isNonRetryable = (s3Service as any).isNonRetryableError({ name: errorName });
        expect(isNonRetryable).toBe(false);
      });
    });

    it('should convert S3 errors to WikiError with appropriate codes', () => {
      const testCases = [
        { s3Error: { name: 'AccessDenied' }, expectedCode: ErrorCodes.S3_ACCESS_DENIED },
        { s3Error: { name: 'NoSuchBucket' }, expectedCode: ErrorCodes.BUCKET_NOT_FOUND },
        { s3Error: { name: 'NetworkingError' }, expectedCode: ErrorCodes.NETWORK_ERROR },
        { s3Error: { name: 'PreconditionFailed' }, expectedCode: ErrorCodes.EDIT_CONFLICT }
      ];

      testCases.forEach(({ s3Error, expectedCode }) => {
        const wikiError = (s3Service as any).handleS3Error(s3Error);
        expect(wikiError).toBeInstanceOf(WikiError);
        expect(wikiError.code).toBe(expectedCode);
      });
    });
  });

  describe('Helper Methods', () => {
    it('should extract title from path correctly', () => {
      const testCases = [
        { path: 'index.md', expected: 'index' },
        { path: 'folder/my-page.md', expected: 'my page' },
        { path: 'deep/nested/folder/test_file.md', expected: 'test file' }
      ];

      testCases.forEach(({ path, expected }) => {
        const title = (s3Service as any).extractTitleFromPath(path);
        expect(title).toBe(expected);
      });
    });

    it('should parse page metadata correctly', () => {
      const s3Metadata = {
        'created-at': '2024-01-01T00:00:00.000Z',
        'updated-at': '2024-01-02T00:00:00.000Z',
        'author': 'test-user',
        'version': '2',
        'tags': 'tag1,tag2,tag3'
      };

      const metadata = (s3Service as any).parsePageMetadata(s3Metadata);
      
      expect(metadata.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(metadata.updatedAt).toEqual(new Date('2024-01-02T00:00:00.000Z'));
      expect(metadata.author).toBe('test-user');
      expect(metadata.version).toBe(2);
      expect(metadata.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle missing metadata gracefully', () => {
      const metadata = (s3Service as any).parsePageMetadata({});
      
      expect(metadata.author).toBe('unknown');
      expect(metadata.version).toBe(1);
      expect(metadata.tags).toBeUndefined();
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('File Validation', () => {
    it('should validate file size correctly', async () => {
      // Create a mock file that exceeds the size limit
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain'
      });

      await expect(s3Service.uploadFile(largeFile, 'test/large.txt'))
        .rejects
        .toThrow(WikiError);
    });
  });
});
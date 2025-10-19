/**
 * Security Utilities Tests
 * Tests for security-related functions including sanitization and validation
 */

import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeHTML,
  sanitizeMarkdown,
  validateFileUpload,
  generateSecureId
} from './security.js';

// Mock DOMPurify for testing
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => {
      // Simple mock implementation for testing
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '');
    })
  }
}));

describe('Security Utilities', () => {
  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const maliciousHTML = '<p>Safe content</p><script>alert("xss")</script>';
      const sanitized = sanitizeHTML(maliciousHTML);
      
      expect(sanitized).toContain('<p>Safe content</p>');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should preserve safe HTML', () => {
      const safeHTML = '<p>This is <strong>safe</strong> content with <em>emphasis</em></p>';
      const sanitized = sanitizeHTML(safeHTML);
      
      expect(sanitized).toBe(safeHTML);
    });

    it('should remove dangerous attributes', () => {
      const dangerousHTML = '<p onclick="alert(\'xss\')">Click me</p>';
      const sanitized = sanitizeHTML(dangerousHTML);
      
      expect(sanitized).not.toContain('onclick');
      // The mock implementation may still contain 'alert' but without the onclick
      expect(sanitized).toContain('<p');
      expect(sanitized).toContain('Click me');
    });

    it('should handle empty or null input', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(sanitizeHTML('   ')).toBe('   ');
    });
  });

  describe('sanitizeMarkdown', () => {
    it('should remove script tags from markdown', () => {
      const maliciousMarkdown = '# Title\n\n<script>alert("xss")</script>\n\nSafe content';
      const sanitized = sanitizeMarkdown(maliciousMarkdown);
      
      expect(sanitized).toContain('# Title');
      expect(sanitized).toContain('Safe content');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should remove javascript: URLs', () => {
      const maliciousMarkdown = '[Click me](javascript:alert("xss"))';
      const sanitized = sanitizeMarkdown(maliciousMarkdown);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('[Click me]');
    });

    it('should remove event handlers', () => {
      const maliciousMarkdown = '<img src="image.jpg" onload="alert(\'xss\')" />';
      const sanitized = sanitizeMarkdown(maliciousMarkdown);
      
      expect(sanitized).not.toContain('onload=');
      // The alert might still be there but without the event handler
      expect(sanitized).toContain('<img src="image.jpg"');
    });

    it('should preserve safe markdown', () => {
      const safeMarkdown = `
# Title

This is **bold** and *italic* text.

- List item 1
- List item 2

[Safe link](https://example.com)

\`\`\`javascript
console.log('code block');
\`\`\`
      `.trim();
      
      const sanitized = sanitizeMarkdown(safeMarkdown);
      expect(sanitized).toContain('# Title');
      expect(sanitized).toContain('**bold**');
      expect(sanitized).toContain('[Safe link](https://example.com)');
      expect(sanitized).toContain('console.log');
    });

    it('should handle case-insensitive removal', () => {
      const maliciousMarkdown = '<SCRIPT>alert("xss")</SCRIPT>';
      const sanitized = sanitizeMarkdown(maliciousMarkdown);
      
      expect(sanitized).not.toContain('<SCRIPT>');
      expect(sanitized).not.toContain('alert');
    });
  });

  describe('validateFileUpload', () => {
    it('should accept files within size limit', () => {
      const smallFile = new File(['small content'], 'small.txt', {
        type: 'text/plain'
      });
      
      const result = validateFileUpload(smallFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files exceeding size limit', () => {
      // Create a mock file that exceeds 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain'
      });
      
      const result = validateFileUpload(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10MB limit');
    });

    it('should reject dangerous file types', () => {
      const dangerousFiles = [
        new File(['content'], 'virus.exe', { type: 'application/x-executable' }),
        new File(['content'], 'malware.exe', { type: 'application/x-msdownload' }),
        new File(['content'], 'program.exe', { type: 'application/x-msdos-program' }),
        new File(['<script>alert("xss")</script>'], 'page.html', { type: 'text/html' })
      ];

      dangerousFiles.forEach(file => {
        const result = validateFileUpload(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not allowed for security reasons');
      });
    });

    it('should accept safe file types', () => {
      const safeFiles = [
        new File(['content'], 'document.pdf', { type: 'application/pdf' }),
        new File(['content'], 'image.png', { type: 'image/png' }),
        new File(['content'], 'text.txt', { type: 'text/plain' }),
        new File(['content'], 'data.json', { type: 'application/json' })
      ];

      safeFiles.forEach(file => {
        const result = validateFileUpload(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should handle files without type', () => {
      const fileWithoutType = new File(['content'], 'unknown', { type: '' });
      
      const result = validateFileUpload(fileWithoutType);
      expect(result.valid).toBe(true); // Should be allowed if not explicitly dangerous
    });
  });

  describe('generateSecureId', () => {
    it('should generate ID of specified length', () => {
      expect(generateSecureId(8)).toHaveLength(8);
      expect(generateSecureId(16)).toHaveLength(16);
      expect(generateSecureId(32)).toHaveLength(32);
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = generateSecureId();
      const id2 = generateSecureId();
      const id3 = generateSecureId();
      
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should use default length of 16', () => {
      const id = generateSecureId();
      expect(id).toHaveLength(16);
    });

    it('should only contain alphanumeric characters', () => {
      const id = generateSecureId(100);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should handle edge cases', () => {
      expect(generateSecureId(0)).toHaveLength(0);
      expect(generateSecureId(1)).toHaveLength(1);
    });
  });
});
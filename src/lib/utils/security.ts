/**
 * Security utilities
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html);
}

/**
 * Sanitize markdown content
 */
export function sanitizeMarkdown(content: string): string {
  // Basic sanitization - remove potentially dangerous content
  // This is a simple implementation; in production, you might want more sophisticated filtering
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Validate and sanitize file upload
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  // Check file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }
  
  // Check for potentially dangerous file types
  const dangerousTypes = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'text/html'
  ];
  
  if (dangerousTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed for security reasons' };
  }
  
  return { valid: true };
}

/**
 * Generate secure random string
 */
export function generateSecureId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}
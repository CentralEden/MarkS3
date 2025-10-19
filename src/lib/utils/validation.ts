/**
 * Input validation utilities
 */

import { APP_CONFIG } from '../config/app.js';

/**
 * Validate file size
 */
export function validateFileSize(file: File): boolean {
  return file.size <= APP_CONFIG.maxFileSize;
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return APP_CONFIG.allowedImageTypes.includes(file.type);
}

/**
 * Validate page path
 */
export function validatePagePath(path: string): boolean {
  // Basic validation: no empty path, no special characters that could cause issues
  if (!path || path.trim().length === 0) return false;
  
  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(path)) return false;
  
  // Must end with .md
  if (!path.endsWith('.md')) return false;
  
  return true;
}

/**
 * Validate page title
 */
export function validatePageTitle(title: string): boolean {
  return !!(title && title.trim().length > 0 && title.length <= 200);
}

/**
 * Sanitize filename for S3
 */
export function sanitizeFilename(filename: string): string {
  // Replace invalid characters with underscores
  return filename.replace(/[<>:"|?*]/g, '_');
}

/**
 * Generate unique filename to avoid conflicts
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const sanitizedName = sanitizeFilename(nameWithoutExt);
  
  return `${sanitizedName}_${timestamp}.${extension}`;
}
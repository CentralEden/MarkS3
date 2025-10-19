/**
 * Error handling types
 */

export class WikiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WikiError';
  }
}

export enum ErrorCodes {
  AUTH_FAILED = 'AUTH_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  S3_ACCESS_DENIED = 'S3_ACCESS_DENIED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  BUCKET_NOT_FOUND = 'BUCKET_NOT_FOUND',
  ORPHANED_FILES_FOUND = 'ORPHANED_FILES_FOUND',
  EDIT_CONFLICT = 'EDIT_CONFLICT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  PAGE_NOT_FOUND = 'PAGE_NOT_FOUND',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  CONFIG_ERROR = 'CONFIG_ERROR'
}
/**
 * Type definitions index
 * Re-exports all types for convenient importing
 */

// Authentication types
export type { User, AuthResult, AuthService } from './auth.js';
export { UserRole } from './auth.js';

// Wiki types
export type {
  WikiPage,
  PageMetadata,
  WikiPageMeta,
  PageNode,
  SaveResult,
  PageDeletionResult,
  FileInfo,
  WikiConfig,
  MetadataOperation
} from './wiki.js';

// AWS service types
export type {
  S3Service,
  WikiService,
  FileService,
  AWSConfig
} from './aws.js';

// Error types
export { WikiError, ErrorCodes } from './errors.js';
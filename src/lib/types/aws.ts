/**
 * AWS service related types
 */

import type { WikiPage, WikiPageMeta, WikiConfig, FileInfo, SaveResult, MetadataOperation, User, AuthResult } from './wiki.js';

export interface S3Service {
  // Page operations
  getPage(path: string): Promise<WikiPage>;
  savePage(page: WikiPage, etag?: string): Promise<SaveResult>;
  deletePage(path: string): Promise<void>;
  listPages(prefix?: string): Promise<WikiPageMeta[]>;
  
  // File operations
  uploadFile(file: File, path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  listFiles(): Promise<FileInfo[]>;
  getFileUrl(path: string): Promise<string>;
  
  // Configuration operations
  getConfig(): Promise<WikiConfig>;
  saveConfig(config: WikiConfig): Promise<void>;
  
  // Metadata operations (atomic)
  updateMetadata(operation: MetadataOperation): Promise<void>;
}

export interface WikiService {
  createPage(path: string, content: string): Promise<WikiPage>;
  updatePage(path: string, content: string): Promise<WikiPage>;
  getPage(path: string): Promise<WikiPage>;
  deletePage(path: string): Promise<import('./wiki.js').PageDeletionResult>;
  searchPages(query: string): Promise<WikiPageMeta[]>;
  getPageHierarchy(): Promise<import('./wiki.js').PageNode[]>;
  getPageAttachments(path: string): Promise<FileInfo[]>;
}

export interface FileService {
  uploadFile(file: File): Promise<FileInfo>;
  deleteFile(fileId: string): Promise<void>;
  getFileReferences(fileId: string): Promise<string[]>;
  listFiles(): Promise<FileInfo[]>;
  isImageFile(filename: string): boolean;
  findOrphanedFiles(deletedPagePath: string): Promise<FileInfo[]>;
  deleteOrphanedFiles(fileIds: string[]): Promise<void>;
}

export interface AuthService {
  login(username: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  refreshToken(): Promise<string>;
  checkPermission(action: string): boolean;
}

export interface AWSConfig {
  region: string;
  bucketName: string;
  cognitoUserPoolId: string;
  cognitoIdentityPoolId: string;
  cognitoClientId: string;
}

// Error handling types
export enum ErrorCodes {
  AUTH_FAILED = 'AUTH_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  S3_ACCESS_DENIED = 'S3_ACCESS_DENIED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  BUCKET_NOT_FOUND = 'BUCKET_NOT_FOUND',
  ORPHANED_FILES_FOUND = 'ORPHANED_FILES_FOUND',
  EDIT_CONFLICT = 'EDIT_CONFLICT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE'
}

export class WikiError extends Error {
  constructor(
    public code: ErrorCodes,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WikiError';
  }
}
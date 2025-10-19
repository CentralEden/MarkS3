/**
 * Wiki page and content related types
 */

// User and Authentication types
export enum UserRole {
  GUEST = 'guest',
  REGULAR = 'regular',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  email: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface WikiPage {
  path: string;
  title: string;
  content: string;
  metadata: PageMetadata;
  etag?: string;
}

export interface PageMetadata {
  createdAt: Date;
  updatedAt: Date;
  author: string;
  version: number;
  tags?: string[];
}

export interface WikiPageMeta {
  path: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  author: string;
  tags?: string[];
}

export interface PageNode {
  path: string;
  title: string;
  children?: PageNode[];
  isFolder: boolean;
}

export interface SaveResult {
  success: boolean;
  etag: string;
  conflict?: boolean;
  conflictData?: WikiPage;
}

export interface PageDeletionResult {
  deletedPage: string;
  orphanedFiles: FileInfo[];
  confirmationRequired: boolean;
}

export interface FileInfo {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
  url: string;
}

export interface WikiConfig {
  title: string;
  description: string;
  allowGuestAccess: boolean;
  theme: string;
  features: {
    fileUpload: boolean;
    userManagement: boolean;
    search: boolean;
    pageHistory: boolean;
  };
  limits: {
    maxFileSize: number;
    maxPages: number;
    maxFilesPerPage: number;
  };
}

export interface MetadataOperation {
  type: 'add' | 'update' | 'delete';
  pageData: WikiPageMeta;
  expectedVersion?: string;
}
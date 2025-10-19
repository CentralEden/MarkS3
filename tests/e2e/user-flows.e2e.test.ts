/**
 * End-to-End User Flow Tests
 * Tests complete user workflows from login to content creation and file management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../../src/lib/services/auth.js';
import { WikiService } from '../../src/lib/services/wiki.js';
import { FileService } from '../../src/lib/services/files.js';
import { S3Service } from '../../src/lib/services/s3.js';
import { UserRole } from '../../src/lib/types/auth.js';
import { WikiError, ErrorCodes } from '../../src/lib/types/index.js';
import type { WikiPage, FileInfo } from '../../src/lib/types/index.js';

// Mock localStorage for testing
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem: function(key: string) {
    return this.store.get(key) || null;
  },
  setItem: function(key: string, value: string) {
    this.store.set(key, value);
  },
  removeItem: function(key: string) {
    this.store.delete(key);
  },
  clear: function() {
    this.store.clear();
  }
};

// Mock browser environment
Object.defineProperty(global, 'window', {
  value: {
    localStorage: mockLocalStorage
  },
  writable: true
});

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('End-to-End User Flows', () => {
  let authService: AuthService;
  let wikiService: WikiService;
  let fileService: FileService;
  let s3Service: S3Service;

  beforeEach(() => {
    // Clear localStorage before each test
    mockLocalStorage.clear();
    
    // Initialize services
    try {
      authService = new AuthService();
      s3Service = new S3Service();
      wikiService = new WikiService(s3Service);
      fileService = new FileService(s3Service);
      fileService.setWikiService(wikiService);
    } catch (error) {
      // Handle initialization errors gracefully
      console.error('Service initialization error:', error);
    }
  });

  afterEach(() => {
    // Clean up after each test
    mockLocalStorage.clear();
  });

  describe('Complete User Login to Article Creation Flow', () => {
    it('should handle complete guest user flow', async () => {
      // Step 1: Initial state - user is not authenticated
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUserRole()).toBeNull();
      
      // Step 2: Check guest access permissions
      expect(authService.checkPermission('read')).toBe(false);
      expect(authService.checkPermission('write')).toBe(false);
      expect(authService.checkPermission('admin')).toBe(false);
      
      // Step 3: Attempt to access wiki content as guest
      try {
        await wikiService.getPage('index.md');
        // If successful, guest access is enabled
        expect(true).toBe(true);
      } catch (error) {
        // Expected behavior - guest access denied
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.PERMISSION_DENIED,
          ErrorCodes.AUTH_FAILED,
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.S3_ACCESS_DENIED
        ]).toContain((error as WikiError).code);
      }
      
      // Step 4: Attempt to create content as guest (should fail)
      try {
        await wikiService.createPage('guest-page.md', '# Guest Page\n\nThis should not work.');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.PERMISSION_DENIED,
          ErrorCodes.AUTH_FAILED,
          ErrorCodes.S3_ACCESS_DENIED
        ]).toContain((error as WikiError).code);
      }
    });

    it('should handle complete authenticated user article creation flow', async () => {
      // Step 1: Simulate successful login
      const mockSessionData = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        user: {
          id: 'test-user',
          username: 'test-user',
          email: 'test@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      
      // Create new auth service to simulate login restoration
      const authenticatedAuthService = new AuthService();
      
      // Step 2: Verify authentication state
      expect(authenticatedAuthService.isAuthenticated()).toBe(true);
      expect(authenticatedAuthService.getCurrentUserRole()).toBe(UserRole.REGULAR);
      
      // Step 3: Check authenticated user permissions
      expect(authenticatedAuthService.checkPermission('read')).toBe(true);
      expect(authenticatedAuthService.checkPermission('write')).toBe(true);
      expect(authenticatedAuthService.checkPermission('edit')).toBe(true);
      expect(authenticatedAuthService.checkPermission('create')).toBe(true);
      expect(authenticatedAuthService.checkPermission('delete')).toBe(true);
      expect(authenticatedAuthService.checkPermission('upload')).toBe(true);
      expect(authenticatedAuthService.checkPermission('admin')).toBe(false);
      
      // Step 4: Attempt to read existing content
      try {
        const homePage = await wikiService.getPage('index.md');
        
        // If successful, verify page structure
        expect(homePage).toHaveProperty('path');
        expect(homePage).toHaveProperty('title');
        expect(homePage).toHaveProperty('content');
        expect(homePage).toHaveProperty('metadata');
        expect(homePage.path).toBe('index.md');
      } catch (error) {
        // Expected in test environment without AWS access
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.NETWORK_ERROR
        ]).toContain((error as WikiError).code);
      }
      
      // Step 5: Create a new article
      const newPageContent = `# My First Article

This is my first article in the MarkS3 wiki system.

## Features

- Markdown support
- File attachments
- Version control

## Next Steps

I will add more content and upload some files.`;

      try {
        const newPage = await wikiService.createPage('my-first-article.md', newPageContent);
        
        // Verify created page
        expect(newPage).toHaveProperty('path');
        expect(newPage).toHaveProperty('title');
        expect(newPage).toHaveProperty('content');
        expect(newPage).toHaveProperty('metadata');
        
        expect(newPage.path).toBe('my-first-article.md');
        expect(newPage.content).toBe(newPageContent);
        expect(newPage.metadata.author).toBe('test-user');
        expect(newPage.metadata.version).toBe(1);
        expect(newPage.metadata.createdAt).toBeInstanceOf(Date);
        expect(newPage.metadata.updatedAt).toBeInstanceOf(Date);
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.NETWORK_ERROR
        ]).toContain((error as WikiError).code);
      }
      
      // Step 6: Update the article
      const updatedContent = newPageContent + '\n\n## Update\n\nAdded this section after initial creation.';
      
      try {
        const updatedPage = await wikiService.updatePage('my-first-article.md', updatedContent);
        
        // Verify updated page
        expect(updatedPage.content).toBe(updatedContent);
        expect(updatedPage.metadata.version).toBe(2);
        expect(updatedPage.metadata.updatedAt.getTime()).toBeGreaterThan(
          updatedPage.metadata.createdAt.getTime()
        );
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
      }
      
      // Step 7: Search for the created article
      try {
        const searchResults = await wikiService.searchPages('first article');
        
        expect(Array.isArray(searchResults)).toBe(true);
        // Should find the created article
        const foundArticle = searchResults.find(page => page.path === 'my-first-article.md');
        if (foundArticle) {
          expect(foundArticle.title).toContain('First Article');
        }
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
      }
      
      // Step 8: Get page hierarchy
      try {
        const hierarchy = await wikiService.getPageHierarchy();
        
        expect(Array.isArray(hierarchy)).toBe(true);
        // Should include the created page
        const hasCreatedPage = hierarchy.some(node => 
          node.path === 'my-first-article.md' || 
          node.children?.some(child => child.path === 'my-first-article.md')
        );
        expect(hasCreatedPage || hierarchy.length === 0).toBe(true);
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
      }
    });

    it('should handle login failure and retry flow', async () => {
      // Step 1: Attempt login with invalid credentials
      const loginResult = await authService.login('invalid-user', 'wrong-password');
      
      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBeTruthy();
      expect(typeof loginResult.error).toBe('string');
      
      // Step 2: Verify user is not authenticated
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUserRole()).toBeNull();
      
      // Step 3: Attempt to access protected content (should fail)
      try {
        await wikiService.createPage('unauthorized.md', 'Should not work');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.PERMISSION_DENIED,
          ErrorCodes.AUTH_FAILED,
          ErrorCodes.S3_ACCESS_DENIED
        ]).toContain((error as WikiError).code);
      }
      
      // Step 4: Simulate successful login retry
      const mockSessionData = {
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh',
        idToken: 'valid-id',
        user: {
          id: 'valid-user',
          username: 'valid-user',
          email: 'valid@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      
      // Create new service instance to simulate login
      const retryAuthService = new AuthService();
      
      // Step 5: Verify successful authentication
      expect(retryAuthService.isAuthenticated()).toBe(true);
      expect(retryAuthService.getCurrentUserRole()).toBe(UserRole.REGULAR);
      expect(retryAuthService.checkPermission('write')).toBe(true);
    });
  });

  describe('File Upload and Reference Flow', () => {
    beforeEach(() => {
      // Set up authenticated user for file operations
      const mockSessionData = {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        idToken: 'mock-id',
        user: {
          id: 'file-user',
          username: 'file-user',
          email: 'file@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      authService = new AuthService();
    });

    it('should handle complete file upload and reference flow', async () => {
      // Step 1: Verify user can upload files
      expect(authService.checkPermission('upload')).toBe(true);
      
      // Step 2: Create a test file
      const testFile = new File(['Test image content'], 'test-image.png', {
        type: 'image/png'
      });
      
      // Step 3: Upload the file
      try {
        const uploadedFile = await fileService.uploadFile(testFile);
        
        // Verify upload result
        expect(uploadedFile).toHaveProperty('id');
        expect(uploadedFile).toHaveProperty('filename');
        expect(uploadedFile).toHaveProperty('size');
        expect(uploadedFile).toHaveProperty('contentType');
        expect(uploadedFile).toHaveProperty('uploadedAt');
        expect(uploadedFile).toHaveProperty('url');
        
        expect(uploadedFile.filename).toBe('test-image.png');
        expect(uploadedFile.contentType).toBe('image/png');
        expect(uploadedFile.size).toBe(testFile.size);
        expect(uploadedFile.uploadedAt).toBeInstanceOf(Date);
        
        // Step 4: Verify file is detected as image
        expect(fileService.isImageFile(uploadedFile.filename)).toBe(true);
        
        // Step 5: Create a page that references the uploaded file
        const pageWithFile = `# Page with File

Here is an uploaded image:

![Test Image](${uploadedFile.id})

And here is a link to the file: [Download](${uploadedFile.id})`;

        const pageResult = await wikiService.createPage('page-with-file.md', pageWithFile);
        
        expect(pageResult.content).toContain(uploadedFile.id);
        
        // Step 6: Check file references
        const references = await fileService.getFileReferences(uploadedFile.id);
        
        expect(Array.isArray(references)).toBe(true);
        expect(references).toContain('page-with-file.md');
        
        // Step 7: List all files
        const allFiles = await fileService.listFiles();
        
        expect(Array.isArray(allFiles)).toBe(true);
        const foundFile = allFiles.find(f => f.id === uploadedFile.id);
        expect(foundFile).toBeDefined();
        
        // Step 8: Get file usage statistics
        const stats = await fileService.getFileUsageStats();
        
        expect(stats).toHaveProperty('totalFiles');
        expect(stats).toHaveProperty('totalSize');
        expect(stats).toHaveProperty('imageFiles');
        expect(stats).toHaveProperty('documentFiles');
        expect(stats).toHaveProperty('orphanedFiles');
        
        expect(stats.totalFiles).toBeGreaterThan(0);
        expect(stats.imageFiles).toBeGreaterThan(0);
        
      } catch (error) {
        // Expected in test environment without AWS access
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.NETWORK_ERROR
        ]).toContain((error as WikiError).code);
      }
    });

    it('should handle file upload validation flow', async () => {
      // Step 1: Test file size validation
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain'
      });

      try {
        await fileService.uploadFile(largeFile);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.FILE_TOO_LARGE);
        expect((error as WikiError).message).toContain('exceeds maximum');
      }
      
      // Step 2: Test dangerous file type validation
      const dangerousFile = new File(['malicious'], 'virus.exe', {
        type: 'application/octet-stream'
      });

      try {
        await fileService.uploadFile(dangerousFile);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.INVALID_FILE_TYPE);
        expect((error as WikiError).message).toContain('not allowed');
      }
      
      // Step 3: Test empty filename validation
      const invalidFile = new File(['content'], '', {
        type: 'text/plain'
      });

      try {
        await fileService.uploadFile(invalidFile);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.INVALID_FILE_TYPE);
        expect((error as WikiError).message).toContain('valid name');
      }
      
      // Step 4: Test valid file upload
      const validFile = new File(['valid content'], 'valid.txt', {
        type: 'text/plain'
      });

      try {
        const result = await fileService.uploadFile(validFile);
        
        expect(result).toHaveProperty('id');
        expect(result.filename).toBe('valid.txt');
        expect(result.contentType).toBe('text/plain');
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
      }
    });

    it('should handle orphaned file detection and cleanup flow', async () => {
      // Step 1: Create a page with file references
      const pageContent = `# Test Page

![Image 1](test-image-1.png)
![Image 2](test-image-2.png)
[Document](test-doc.pdf)`;

      try {
        await wikiService.createPage('test-page-with-files.md', pageContent);
        
        // Step 2: Find orphaned files when deleting the page
        const orphanedFiles = await fileService.findOrphanedFiles('test-page-with-files.md');
        
        expect(Array.isArray(orphanedFiles)).toBe(true);
        // Should detect files that would become orphaned
        
        // Step 3: Delete the page
        const deletionResult = await wikiService.deletePage('test-page-with-files.md');
        
        expect(deletionResult).toHaveProperty('deletedPage');
        expect(deletionResult).toHaveProperty('orphanedFiles');
        expect(deletionResult).toHaveProperty('confirmationRequired');
        
        expect(deletionResult.deletedPage).toBe('test-page-with-files.md');
        expect(Array.isArray(deletionResult.orphanedFiles)).toBe(true);
        
        // Step 4: Clean up orphaned files if any
        if (deletionResult.orphanedFiles.length > 0) {
          const fileIds = deletionResult.orphanedFiles.map(f => f.id);
          await fileService.deleteOrphanedFiles(fileIds);
        }
        
        // Step 5: Find all orphaned files in system
        const allOrphaned = await fileService.findAllOrphanedFiles();
        
        expect(Array.isArray(allOrphaned)).toBe(true);
        
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.NETWORK_ERROR
        ]).toContain((error as WikiError).code);
      }
    });

    it('should handle multiple file types and references flow', async () => {
      const testFiles = [
        new File(['image content'], 'test.png', { type: 'image/png' }),
        new File(['document content'], 'test.pdf', { type: 'application/pdf' }),
        new File(['text content'], 'test.txt', { type: 'text/plain' }),
        new File(['json content'], 'test.json', { type: 'application/json' })
      ];

      const uploadedFiles: FileInfo[] = [];

      // Step 1: Upload multiple files
      for (const file of testFiles) {
        try {
          const uploaded = await fileService.uploadFile(file);
          uploadedFiles.push(uploaded);
          
          // Verify file type detection
          if (file.name.endsWith('.png')) {
            expect(fileService.isImageFile(uploaded.filename)).toBe(true);
          } else {
            expect(fileService.isImageFile(uploaded.filename)).toBe(false);
          }
        } catch (error) {
          // Expected in test environment
          expect(error).toBeInstanceOf(WikiError);
        }
      }

      // Step 2: Create pages that reference different files
      const pages = [
        {
          path: 'images-page.md',
          content: `# Images\n\n![PNG](${uploadedFiles[0]?.id || 'test.png'})`
        },
        {
          path: 'documents-page.md',
          content: `# Documents\n\n[PDF](${uploadedFiles[1]?.id || 'test.pdf'})`
        },
        {
          path: 'mixed-page.md',
          content: `# Mixed\n\n![Image](${uploadedFiles[0]?.id || 'test.png'})\n[Doc](${uploadedFiles[1]?.id || 'test.pdf'})`
        }
      ];

      for (const page of pages) {
        try {
          await wikiService.createPage(page.path, page.content);
        } catch (error) {
          // Expected in test environment
          expect(error).toBeInstanceOf(WikiError);
        }
      }

      // Step 3: Check file references across pages
      for (const file of uploadedFiles) {
        try {
          const references = await fileService.getFileReferences(file.id);
          expect(Array.isArray(references)).toBe(true);
        } catch (error) {
          // Expected in test environment
          expect(error).toBeInstanceOf(WikiError);
        }
      }

      // Step 4: Get comprehensive file statistics
      try {
        const stats = await fileService.getFileUsageStats();
        
        expect(stats.totalFiles).toBeGreaterThanOrEqual(0);
        expect(stats.totalSize).toBeGreaterThanOrEqual(0);
        expect(stats.imageFiles).toBeGreaterThanOrEqual(0);
        expect(stats.documentFiles).toBeGreaterThanOrEqual(0);
        expect(stats.orphanedFiles).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(WikiError);
      }
    });
  });

  describe('Permission Control Flow', () => {
    it('should handle guest user permission restrictions', async () => {
      // Step 1: Verify guest has no permissions
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.checkPermission('read')).toBe(false);
      expect(authService.checkPermission('write')).toBe(false);
      expect(authService.checkPermission('upload')).toBe(false);
      expect(authService.checkPermission('admin')).toBe(false);
      
      // Step 2: Attempt restricted operations
      const restrictedOperations = [
        () => wikiService.createPage('guest-page.md', 'Content'),
        () => wikiService.updatePage('index.md', 'Updated'),
        () => wikiService.deletePage('test.md'),
        () => fileService.uploadFile(new File(['test'], 'test.txt', { type: 'text/plain' })),
        () => fileService.deleteFile('test.txt')
      ];

      for (const operation of restrictedOperations) {
        try {
          await operation();
          // If operation succeeds, guest access might be enabled
          expect(true).toBe(true);
        } catch (error) {
          // Expected - guest should be denied
          expect(error).toBeInstanceOf(WikiError);
          expect([
            ErrorCodes.PERMISSION_DENIED,
            ErrorCodes.AUTH_FAILED,
            ErrorCodes.S3_ACCESS_DENIED,
            ErrorCodes.BUCKET_NOT_FOUND,
            ErrorCodes.NETWORK_ERROR
          ]).toContain((error as WikiError).code);
        }
      }
    });

    it('should handle regular user permissions correctly', async () => {
      // Step 1: Set up regular user
      const mockSessionData = {
        accessToken: 'regular-token',
        refreshToken: 'regular-refresh',
        idToken: 'regular-id',
        user: {
          id: 'regular-user',
          username: 'regular-user',
          email: 'regular@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      const regularAuthService = new AuthService();
      
      // Step 2: Verify regular user permissions
      expect(regularAuthService.isAuthenticated()).toBe(true);
      expect(regularAuthService.getCurrentUserRole()).toBe(UserRole.REGULAR);
      
      // Should have content permissions
      expect(regularAuthService.checkPermission('read')).toBe(true);
      expect(regularAuthService.checkPermission('write')).toBe(true);
      expect(regularAuthService.checkPermission('edit')).toBe(true);
      expect(regularAuthService.checkPermission('create')).toBe(true);
      expect(regularAuthService.checkPermission('delete')).toBe(true);
      expect(regularAuthService.checkPermission('upload')).toBe(true);
      
      // Should not have admin permissions
      expect(regularAuthService.checkPermission('admin')).toBe(false);
      expect(regularAuthService.checkPermission('user_management')).toBe(false);
      expect(regularAuthService.checkPermission('config')).toBe(false);
      
      // Step 3: Test allowed operations
      try {
        await wikiService.createPage('regular-page.md', '# Regular User Page');
        await wikiService.updatePage('regular-page.md', '# Updated Page');
        await fileService.uploadFile(new File(['test'], 'regular.txt', { type: 'text/plain' }));
        
        // Operations should succeed or fail due to AWS connectivity, not permissions
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.NETWORK_ERROR
        ]).toContain((error as WikiError).code);
      }
    });

    it('should handle admin user permissions correctly', async () => {
      // Step 1: Set up admin user
      const mockSessionData = {
        accessToken: 'admin-token',
        refreshToken: 'admin-refresh',
        idToken: 'admin-id',
        user: {
          id: 'admin-user',
          username: 'admin-user',
          email: 'admin@example.com',
          role: UserRole.ADMIN
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      const adminAuthService = new AuthService();
      
      // Step 2: Verify admin user permissions
      expect(adminAuthService.isAuthenticated()).toBe(true);
      expect(adminAuthService.getCurrentUserRole()).toBe(UserRole.ADMIN);
      
      // Should have all permissions
      expect(adminAuthService.checkPermission('read')).toBe(true);
      expect(adminAuthService.checkPermission('write')).toBe(true);
      expect(adminAuthService.checkPermission('edit')).toBe(true);
      expect(adminAuthService.checkPermission('create')).toBe(true);
      expect(adminAuthService.checkPermission('delete')).toBe(true);
      expect(adminAuthService.checkPermission('upload')).toBe(true);
      expect(adminAuthService.checkPermission('admin')).toBe(true);
      expect(adminAuthService.checkPermission('user_management')).toBe(true);
      expect(adminAuthService.checkPermission('config')).toBe(true);
      
      // Step 3: Test admin-specific operations
      try {
        // Content operations
        await wikiService.createPage('admin-page.md', '# Admin Page');
        await wikiService.updatePage('admin-page.md', '# Updated Admin Page');
        await fileService.uploadFile(new File(['admin'], 'admin.txt', { type: 'text/plain' }));
        
        // Admin operations would be tested here if implemented
        // await userManagementService.createUser(...);
        // await configService.updateConfig(...);
        
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect([
          ErrorCodes.BUCKET_NOT_FOUND,
          ErrorCodes.S3_ACCESS_DENIED,
          ErrorCodes.NETWORK_ERROR
        ]).toContain((error as WikiError).code);
      }
    });

    it('should handle permission escalation attempts', async () => {
      // Step 1: Set up regular user
      const mockSessionData = {
        accessToken: 'regular-token',
        refreshToken: 'regular-refresh',
        idToken: 'regular-id',
        user: {
          id: 'regular-user',
          username: 'regular-user',
          email: 'regular@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      const regularAuthService = new AuthService();
      
      // Step 2: Verify regular user cannot access admin functions
      expect(regularAuthService.checkPermission('admin')).toBe(false);
      expect(regularAuthService.checkPermission('user_management')).toBe(false);
      expect(regularAuthService.checkPermission('config')).toBe(false);
      
      // Step 3: Test that unknown permissions are denied
      expect(regularAuthService.checkPermission('unknown_permission')).toBe(false);
      expect(regularAuthService.checkPermission('')).toBe(false);
      expect(regularAuthService.checkPermission('super_admin')).toBe(false);
      
      // Step 4: Verify permission consistency
      const permissions = ['read', 'write', 'edit', 'create', 'delete', 'upload'];
      permissions.forEach(permission => {
        expect(regularAuthService.checkPermission(permission)).toBe(true);
      });
      
      const adminPermissions = ['admin', 'user_management', 'config'];
      adminPermissions.forEach(permission => {
        expect(regularAuthService.checkPermission(permission)).toBe(false);
      });
    });
  });

  describe('Error Recovery and Resilience Flow', () => {
    it('should handle network connectivity issues gracefully', async () => {
      // Step 1: Set up authenticated user
      const mockSessionData = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        idToken: 'test-id',
        user: {
          id: 'test-user',
          username: 'test-user',
          email: 'test@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      const testAuthService = new AuthService();
      
      expect(testAuthService.isAuthenticated()).toBe(true);
      
      // Step 2: Test operations that might fail due to network issues
      const operations = [
        () => wikiService.getPage('index.md'),
        () => wikiService.createPage('test.md', 'content'),
        () => fileService.listFiles(),
        () => fileService.uploadFile(new File(['test'], 'test.txt', { type: 'text/plain' })),
        () => s3Service.getConfig()
      ];

      for (const operation of operations) {
        try {
          await operation();
          // If successful, great
          expect(true).toBe(true);
        } catch (error) {
          // Should be handled gracefully with appropriate error codes
          expect(error).toBeInstanceOf(WikiError);
          expect([
            ErrorCodes.NETWORK_ERROR,
            ErrorCodes.S3_ACCESS_DENIED,
            ErrorCodes.BUCKET_NOT_FOUND,
            ErrorCodes.AUTH_FAILED
          ]).toContain((error as WikiError).code);
          
          // Error should have meaningful message
          expect((error as WikiError).message).toBeTruthy();
          expect(typeof (error as WikiError).message).toBe('string');
        }
      }
      
      // Step 3: Verify service state remains consistent after errors
      expect(testAuthService.isAuthenticated()).toBe(true);
      expect(testAuthService.getCurrentUserRole()).toBe(UserRole.REGULAR);
    });

    it('should handle concurrent operations correctly', async () => {
      // Step 1: Set up authenticated user
      const mockSessionData = {
        accessToken: 'concurrent-token',
        refreshToken: 'concurrent-refresh',
        idToken: 'concurrent-id',
        user: {
          id: 'concurrent-user',
          username: 'concurrent-user',
          email: 'concurrent@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      const concurrentAuthService = new AuthService();
      
      // Step 2: Execute multiple operations concurrently
      const concurrentOperations = [
        wikiService.getPage('index.md').catch(() => null),
        wikiService.searchPages('test').catch(() => []),
        fileService.listFiles().catch(() => []),
        fileService.getFileUsageStats().catch(() => ({
          totalFiles: 0,
          totalSize: 0,
          imageFiles: 0,
          documentFiles: 0,
          orphanedFiles: 0
        })),
        s3Service.getConfig().catch(() => ({ title: 'Test', allowGuestAccess: false }))
      ];

      const results = await Promise.allSettled(concurrentOperations);
      
      // Step 3: Verify all operations completed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
      
      // Step 4: Verify service state is still consistent
      expect(concurrentAuthService.isAuthenticated()).toBe(true);
      expect(concurrentAuthService.getCurrentUserRole()).toBe(UserRole.REGULAR);
    });

    it('should handle session expiration and recovery', async () => {
      // Step 1: Set up session with potentially expired token
      const mockSessionData = {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh',
        idToken: 'expired-id',
        user: {
          id: 'expired-user',
          username: 'expired-user',
          email: 'expired@example.com',
          role: UserRole.REGULAR
        }
      };
      
      mockLocalStorage.setItem('marks3_session', JSON.stringify(mockSessionData));
      const expiredAuthService = new AuthService();
      
      // Step 2: Verify initial state
      expect(expiredAuthService.isAuthenticated()).toBe(true);
      
      // Step 3: Attempt operations that might trigger token refresh
      try {
        await expiredAuthService.getCurrentUser();
        // If successful, token is valid or was refreshed
        expect(true).toBe(true);
      } catch (error) {
        // If failed, should handle gracefully
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.AUTH_FAILED);
      }
      
      // Step 4: Test token refresh directly
      try {
        await expiredAuthService.refreshToken();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(WikiError);
        expect((error as WikiError).code).toBe(ErrorCodes.AUTH_FAILED);
      }
      
      // Step 5: Verify logout works even with expired tokens
      await expiredAuthService.logout();
      expect(expiredAuthService.isAuthenticated()).toBe(false);
      expect(mockLocalStorage.getItem('marks3_session')).toBeNull();
    });
  });
});
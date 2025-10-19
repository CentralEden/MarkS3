/**
 * Wiki Service Implementation
 * Handles wiki page management, hierarchy, and search functionality
 */

import type {
  WikiService as IWikiService,
  WikiPage,
  WikiPageMeta,
  PageNode,
  PageDeletionResult,
  FileInfo,
  S3Service
} from '../types/index.js';
import { WikiError, ErrorCodes } from '../types/index.js';
import { s3Service } from './s3.js';

/**
 * Wiki Service implementation
 */
export class WikiService implements IWikiService {
  private s3Service: S3Service;

  constructor(s3Service: S3Service) {
    this.s3Service = s3Service;
  }

  /**
   * Create a new wiki page
   */
  async createPage(path: string, content: string): Promise<WikiPage> {
    try {
      // Validate path
      this.validatePagePath(path);

      // Check if page already exists
      try {
        await this.s3Service.getPage(path);
        throw new WikiError(
          ErrorCodes.INVALID_FILE_TYPE,
          `Page already exists: ${path}`
        );
      } catch (error) {
        if (error instanceof WikiError && error.code !== ErrorCodes.BUCKET_NOT_FOUND) {
          throw error;
        }
        // Page doesn't exist, which is what we want for creation
      }

      // Extract title from content or path
      const title = this.extractTitleFromContent(content) || this.extractTitleFromPath(path);

      // Create new page with metadata
      const newPage: WikiPage = {
        path,
        title,
        content,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'current-user', // TODO: Get from auth service
          version: 1,
          tags: this.extractTagsFromContent(content)
        }
      };

      // Save the page
      const saveResult = await this.s3Service.savePage(newPage);
      
      if (!saveResult.success) {
        throw new WikiError(
          ErrorCodes.NETWORK_ERROR,
          'Failed to create page'
        );
      }

      return {
        ...newPage,
        etag: saveResult.etag
      };
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to create page: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update an existing wiki page
   */
  async updatePage(path: string, content: string): Promise<WikiPage> {
    try {
      // Get existing page
      const existingPage = await this.s3Service.getPage(path);

      // Extract title from content or keep existing
      const title = this.extractTitleFromContent(content) || existingPage.title;

      // Create updated page
      const updatedPage: WikiPage = {
        ...existingPage,
        title,
        content,
        metadata: {
          ...existingPage.metadata,
          updatedAt: new Date(),
          author: 'current-user', // TODO: Get from auth service
          version: existingPage.metadata.version + 1,
          tags: this.extractTagsFromContent(content)
        }
      };

      // Save with optimistic locking
      const saveResult = await this.s3Service.savePage(updatedPage, existingPage.etag);
      
      if (saveResult.conflict) {
        throw new WikiError(
          ErrorCodes.EDIT_CONFLICT,
          'Page has been modified by another user',
          saveResult.conflictData
        );
      }

      if (!saveResult.success) {
        throw new WikiError(
          ErrorCodes.NETWORK_ERROR,
          'Failed to update page'
        );
      }

      return {
        ...updatedPage,
        etag: saveResult.etag
      };
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to update page: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a wiki page
   */
  async getPage(path: string): Promise<WikiPage> {
    try {
      return await this.s3Service.getPage(path);
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.PAGE_NOT_FOUND,
        `Page not found: ${path}`
      );
    }
  }

  /**
   * Delete a wiki page and handle orphaned files
   */
  async deletePage(path: string): Promise<PageDeletionResult> {
    try {
      // Get page to check if it exists
      const page = await this.s3Service.getPage(path);

      // Find files that are only referenced by this page
      const orphanedFiles = await this.findOrphanedFilesForPage(path);

      // Delete the page
      await this.s3Service.deletePage(path);

      // Update metadata to remove the page
      await this.s3Service.updateMetadata({
        type: 'delete',
        pageData: {
          path,
          title: page.title,
          createdAt: page.metadata.createdAt,
          updatedAt: page.metadata.updatedAt,
          author: page.metadata.author,
          tags: page.metadata.tags
        }
      });

      return {
        deletedPage: path,
        orphanedFiles,
        confirmationRequired: orphanedFiles.length > 0
      };
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to delete page: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search pages by title and content with hierarchical structure consideration
   */
  async searchPages(query: string): Promise<WikiPageMeta[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      // Get all pages
      const allPages = await this.s3Service.listPages();
      const searchTerm = query.toLowerCase();
      const results: WikiPageMeta[] = [];

      // Enhanced search with multiple criteria
      const titleMatches: WikiPageMeta[] = [];
      const pathMatches: WikiPageMeta[] = [];
      const contentMatches: WikiPageMeta[] = [];
      const tagMatches: WikiPageMeta[] = [];

      // Search in titles (highest priority)
      for (const page of allPages) {
        if (page.title.toLowerCase().includes(searchTerm)) {
          titleMatches.push(page);
        }
      }

      // Search in paths/folder structure (high priority)
      for (const page of allPages) {
        if (!titleMatches.some(tm => tm.path === page.path)) {
          const pathParts = page.path.toLowerCase().split('/');
          if (pathParts.some(part => part.includes(searchTerm))) {
            pathMatches.push(page);
          }
        }
      }

      // Search in tags (medium priority)
      for (const page of allPages) {
        if (!titleMatches.some(tm => tm.path === page.path) && 
            !pathMatches.some(pm => pm.path === page.path)) {
          if (page.tags && page.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
            tagMatches.push(page);
          }
        }
      }

      // Search in content (lower priority)
      for (const page of allPages) {
        if (!titleMatches.some(tm => tm.path === page.path) &&
            !pathMatches.some(pm => pm.path === page.path) &&
            !tagMatches.some(tm => tm.path === page.path)) {
          try {
            const fullPage = await this.s3Service.getPage(page.path);
            if (fullPage.content.toLowerCase().includes(searchTerm)) {
              contentMatches.push(page);
            }
          } catch (error) {
            // Skip pages that can't be loaded
            console.warn(`Failed to search content in page ${page.path}:`, error);
          }
        }
      }

      // Combine results with priority order
      results.push(...titleMatches);
      results.push(...pathMatches);
      results.push(...tagMatches);
      results.push(...contentMatches);

      // Sort by relevance within each category, then by hierarchy depth and update date
      return results.sort((a, b) => {
        // Determine match types
        const aIsTitleMatch = titleMatches.some(tm => tm.path === a.path);
        const bIsTitleMatch = titleMatches.some(tm => tm.path === b.path);
        const aIsPathMatch = pathMatches.some(pm => pm.path === a.path);
        const bIsPathMatch = pathMatches.some(pm => pm.path === b.path);
        const aIsTagMatch = tagMatches.some(tm => tm.path === a.path);
        const bIsTagMatch = tagMatches.some(tm => tm.path === b.path);

        // Priority order: title > path > tag > content
        if (aIsTitleMatch && !bIsTitleMatch) return -1;
        if (!aIsTitleMatch && bIsTitleMatch) return 1;
        if (aIsPathMatch && !bIsPathMatch && !bIsTitleMatch) return -1;
        if (!aIsPathMatch && bIsPathMatch && !aIsTitleMatch) return 1;
        if (aIsTagMatch && !bIsTagMatch && !bIsTitleMatch && !bIsPathMatch) return -1;
        if (!aIsTagMatch && bIsTagMatch && !aIsTitleMatch && !aIsPathMatch) return 1;

        // Within same category, prefer shallower hierarchy (fewer path segments)
        const aDepth = a.path.split('/').length;
        const bDepth = b.path.split('/').length;
        if (aDepth !== bDepth) {
          return aDepth - bDepth;
        }

        // Finally, sort by update date (most recent first)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to search pages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get page hierarchy as a tree structure
   */
  async getPageHierarchy(): Promise<PageNode[]> {
    try {
      const allPages = await this.s3Service.listPages();
      return this.buildHierarchy(allPages);
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to get page hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get files attached to a specific page
   */
  async getPageAttachments(path: string): Promise<FileInfo[]> {
    try {
      // Get the page content to find file references
      const page = await this.s3Service.getPage(path);
      const allFiles = await this.s3Service.listFiles();
      
      // Find files referenced in the page content
      const referencedFiles: FileInfo[] = [];
      
      for (const file of allFiles) {
        if (this.isFileReferencedInContent(file, page.content)) {
          referencedFiles.push(file);
        }
      }
      
      return referencedFiles;
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to get page attachments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search pages within a specific folder/hierarchy
   */
  async searchPagesInFolder(query: string, folderPath: string): Promise<WikiPageMeta[]> {
    try {
      // Get all pages in the specified folder
      const folderPages = await this.s3Service.listPages(folderPath);
      
      if (!query.trim()) {
        return folderPages;
      }

      const searchTerm = query.toLowerCase();
      const results: WikiPageMeta[] = [];

      // Search within the folder pages
      for (const page of folderPages) {
        let isMatch = false;

        // Check title
        if (page.title.toLowerCase().includes(searchTerm)) {
          isMatch = true;
        }

        // Check tags
        if (!isMatch && page.tags && page.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
          isMatch = true;
        }

        // Check content
        if (!isMatch) {
          try {
            const fullPage = await this.s3Service.getPage(page.path);
            if (fullPage.content.toLowerCase().includes(searchTerm)) {
              isMatch = true;
            }
          } catch (error) {
            console.warn(`Failed to search content in page ${page.path}:`, error);
          }
        }

        if (isMatch) {
          results.push(page);
        }
      }

      // Sort by relevance and hierarchy
      return results.sort((a, b) => {
        // Prefer exact title matches
        const aExactTitle = a.title.toLowerCase() === searchTerm;
        const bExactTitle = b.title.toLowerCase() === searchTerm;
        if (aExactTitle && !bExactTitle) return -1;
        if (!aExactTitle && bExactTitle) return 1;

        // Then by update date
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to search pages in folder: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get pages by tag
   */
  async getPagesByTag(tag: string): Promise<WikiPageMeta[]> {
    try {
      const allPages = await this.s3Service.listPages();
      const tagLower = tag.toLowerCase();
      
      return allPages
        .filter(page => page.tags && page.tags.some(t => t.toLowerCase() === tagLower))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to get pages by tag: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all unique tags from all pages
   */
  async getAllTags(): Promise<string[]> {
    try {
      const allPages = await this.s3Service.listPages();
      const tagSet = new Set<string>();
      
      for (const page of allPages) {
        if (page.tags) {
          page.tags.forEach(tag => tagSet.add(tag));
        }
      }
      
      return Array.from(tagSet).sort();
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to get all tags: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find all orphaned files in the system
   */
  async findAllOrphanedFiles(): Promise<FileInfo[]> {
    try {
      const allFiles = await this.s3Service.listFiles();
      const allPages = await this.s3Service.listPages();
      const orphanedFiles: FileInfo[] = [];

      for (const file of allFiles) {
        let isReferenced = false;

        // Check if file is referenced in any page
        for (const pageMeta of allPages) {
          try {
            const page = await this.s3Service.getPage(pageMeta.path);
            if (this.isFileReferencedInContent(file, page.content)) {
              isReferenced = true;
              break;
            }
          } catch (error) {
            console.warn(`Failed to check file references in page ${pageMeta.path}:`, error);
          }
        }

        if (!isReferenced) {
          orphanedFiles.push(file);
        }
      }

      return orphanedFiles;
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to find orphaned files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete multiple orphaned files
   */
  async deleteOrphanedFiles(fileIds: string[]): Promise<void> {
    try {
      const deletePromises = fileIds.map(fileId => this.s3Service.deleteFile(fileId));
      await Promise.all(deletePromises);
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to delete orphaned files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get pages that reference a specific file
   */
  async getPagesReferencingFile(fileId: string): Promise<WikiPageMeta[]> {
    try {
      const allPages = await this.s3Service.listPages();
      const referencingPages: WikiPageMeta[] = [];

      for (const pageMeta of allPages) {
        try {
          const page = await this.s3Service.getPage(pageMeta.path);
          // Create a temporary FileInfo object for checking
          const tempFileInfo: FileInfo = {
            id: fileId,
            filename: fileId,
            size: 0,
            contentType: '',
            uploadedAt: new Date(),
            url: ''
          };
          
          if (this.isFileReferencedInContent(tempFileInfo, page.content)) {
            referencingPages.push(pageMeta);
          }
        } catch (error) {
          console.warn(`Failed to check file references in page ${pageMeta.path}:`, error);
        }
      }

      return referencingPages;
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to get pages referencing file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate page deletion and return detailed information
   */
  async validatePageDeletion(path: string): Promise<{
    canDelete: boolean;
    orphanedFiles: FileInfo[];
    referencingPages: WikiPageMeta[];
    warnings: string[];
  }> {
    try {
      const warnings: string[] = [];
      
      // Check if page exists
      let pageExists = true;
      try {
        await this.s3Service.getPage(path);
      } catch (error) {
        pageExists = false;
        warnings.push('Page does not exist');
      }

      if (!pageExists) {
        return {
          canDelete: false,
          orphanedFiles: [],
          referencingPages: [],
          warnings
        };
      }

      // Find orphaned files
      const orphanedFiles = await this.findOrphanedFilesForPage(path);
      
      // Check if other pages reference this page
      const allPages = await this.s3Service.listPages();
      const referencingPages: WikiPageMeta[] = [];
      
      for (const pageMeta of allPages) {
        if (pageMeta.path !== path) {
          try {
            const page = await this.s3Service.getPage(pageMeta.path);
            // Check for wiki links to this page
            const pageNameWithoutExt = path.replace(/\.md$/, '');
            const linkPatterns = [
              new RegExp(`\\[.*?\\]\\(${this.escapeRegExp(path)}\\)`, 'gi'),
              new RegExp(`\\[.*?\\]\\(${this.escapeRegExp(pageNameWithoutExt)}\\)`, 'gi'),
              new RegExp(`\\[\\[${this.escapeRegExp(pageNameWithoutExt)}\\]\\]`, 'gi')
            ];
            
            if (linkPatterns.some(pattern => pattern.test(page.content))) {
              referencingPages.push(pageMeta);
            }
          } catch (error) {
            console.warn(`Failed to check page references in ${pageMeta.path}:`, error);
          }
        }
      }

      if (orphanedFiles.length > 0) {
        warnings.push(`${orphanedFiles.length} file(s) will become orphaned`);
      }

      if (referencingPages.length > 0) {
        warnings.push(`${referencingPages.length} page(s) reference this page`);
      }

      return {
        canDelete: true,
        orphanedFiles,
        referencingPages,
        warnings
      };
    } catch (error) {
      if (error instanceof WikiError) {
        throw error;
      }
      throw new WikiError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to validate page deletion: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Private helper methods

  /**
   * Validate page path format
   */
  private validatePagePath(path: string): void {
    if (!path || path.trim() === '') {
      throw new WikiError(
        ErrorCodes.INVALID_FILE_TYPE,
        'Page path cannot be empty'
      );
    }

    if (!path.endsWith('.md')) {
      throw new WikiError(
        ErrorCodes.INVALID_FILE_TYPE,
        'Page path must end with .md extension'
      );
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(path)) {
      throw new WikiError(
        ErrorCodes.INVALID_FILE_TYPE,
        'Page path contains invalid characters'
      );
    }

    // Check for relative path attempts
    if (path.includes('..') || path.startsWith('/')) {
      throw new WikiError(
        ErrorCodes.INVALID_FILE_TYPE,
        'Page path cannot contain relative path components'
      );
    }
  }

  /**
   * Extract title from markdown content (first # heading)
   */
  private extractTitleFromContent(content: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    return null;
  }

  /**
   * Extract title from file path
   */
  private extractTitleFromPath(path: string): string {
    const filename = path.split('/').pop() || path;
    return filename.replace(/\.md$/, '').replace(/[-_]/g, ' ');
  }

  /**
   * Extract tags from markdown content (look for tags: metadata)
   */
  private extractTagsFromContent(content: string): string[] | undefined {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('tags:')) {
        const tagsStr = trimmed.substring(5).trim();
        return tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }
    return undefined;
  }

  /**
   * Build hierarchical structure from flat page list
   */
  private buildHierarchy(pages: WikiPageMeta[]): PageNode[] {
    const hierarchy: PageNode[] = [];
    const pathMap = new Map<string, PageNode>();

    // Sort pages by path to ensure parent folders are processed first
    const sortedPages = [...pages].sort((a, b) => a.path.localeCompare(b.path));

    for (const page of sortedPages) {
      const pathParts = page.path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!pathMap.has(currentPath)) {
          const isFile = i === pathParts.length - 1;
          const node: PageNode = {
            path: currentPath,
            title: isFile ? page.title : part,
            isFolder: !isFile,
            children: isFile ? undefined : []
          };
          
          pathMap.set(currentPath, node);
          
          if (parentPath) {
            const parent = pathMap.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(node);
            }
          } else {
            hierarchy.push(node);
          }
        }
      }
    }

    return hierarchy;
  }

  /**
   * Find files that would become orphaned if a page is deleted
   */
  private async findOrphanedFilesForPage(pagePath: string): Promise<FileInfo[]> {
    try {
      // Get the page content to find referenced files
      const page = await this.s3Service.getPage(pagePath);
      const allFiles = await this.s3Service.listFiles();
      const allPages = await this.s3Service.listPages();
      
      const orphanedFiles: FileInfo[] = [];
      
      for (const file of allFiles) {
        if (this.isFileReferencedInContent(file, page.content)) {
          // Check if this file is referenced in any other page
          let referencedElsewhere = false;
          
          for (const otherPageMeta of allPages) {
            if (otherPageMeta.path !== pagePath) {
              try {
                const otherPage = await this.s3Service.getPage(otherPageMeta.path);
                if (this.isFileReferencedInContent(file, otherPage.content)) {
                  referencedElsewhere = true;
                  break;
                }
              } catch (error) {
                // Skip pages that can't be loaded
                console.warn(`Failed to check file references in page ${otherPageMeta.path}:`, error);
              }
            }
          }
          
          if (!referencedElsewhere) {
            orphanedFiles.push(file);
          }
        }
      }
      
      return orphanedFiles;
    } catch (error) {
      console.warn('Failed to find orphaned files:', error);
      return [];
    }
  }

  /**
   * Check if a file is referenced in markdown content
   */
  private isFileReferencedInContent(file: FileInfo, content: string): boolean {
    // Look for markdown image syntax: ![alt](filename) or ![alt](url)
    // Look for markdown link syntax: [text](filename) or [text](url)
    const patterns = [
      new RegExp(`!\\[.*?\\]\\(.*?${this.escapeRegExp(file.filename)}.*?\\)`, 'gi'),
      new RegExp(`\\[.*?\\]\\(.*?${this.escapeRegExp(file.filename)}.*?\\)`, 'gi'),
      new RegExp(`!\\[.*?\\]\\(.*?${this.escapeRegExp(file.id)}.*?\\)`, 'gi'),
      new RegExp(`\\[.*?\\]\\(.*?${this.escapeRegExp(file.id)}.*?\\)`, 'gi')
    ];
    
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Export singleton instance
export const wikiService = new WikiService(s3Service);
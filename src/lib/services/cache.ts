/**
 * Cache Service
 * Provides caching functionality for pages, files, and metadata
 * Implements memory management and prefetching strategies
 */

import type { WikiPageMeta, FileInfo, WikiConfig } from '$lib/types/index.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  maxSize: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;
  private stats: CacheStats;
  private cleanupInterval: number;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    maxSize = 100, // Maximum number of cache entries
    defaultTTL = 5 * 60 * 1000, // 5 minutes default TTL
    cleanupInterval = 60 * 1000 // Cleanup every minute
  ) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = cleanupInterval;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      maxSize
    };

    this.startCleanupTimer();
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl ?? this.defaultTTL;

    // If cache is full, evict least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTTL,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.stats.totalSize = this.cache.size;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.totalSize = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.evictions += this.cache.size;
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit ratio
   */
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.stats.evictions++;
    });

    this.stats.totalSize = this.cache.size;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Specialized cache services
class PageCacheService extends CacheService {
  constructor() {
    super(50, 10 * 60 * 1000); // 50 pages, 10 minutes TTL
  }

  /**
   * Cache page metadata list
   */
  setPageList(pages: WikiPageMeta[]): void {
    this.set('page-list', pages, 5 * 60 * 1000); // 5 minutes TTL for page list
  }

  /**
   * Get cached page metadata list
   */
  getPageList(): WikiPageMeta[] | null {
    return this.get<WikiPageMeta[]>('page-list');
  }

  /**
   * Cache individual page content
   */
  setPageContent(path: string, content: string): void {
    this.set(`page-content:${path}`, content);
  }

  /**
   * Get cached page content
   */
  getPageContent(path: string): string | null {
    return this.get<string>(`page-content:${path}`);
  }

  /**
   * Cache page hierarchy
   */
  setPageHierarchy(hierarchy: any[]): void {
    this.set('page-hierarchy', hierarchy, 5 * 60 * 1000);
  }

  /**
   * Get cached page hierarchy
   */
  getPageHierarchy(): any[] | null {
    return this.get<any[]>('page-hierarchy');
  }

  /**
   * Invalidate page-related caches
   */
  invalidatePageCaches(path?: string): void {
    if (path) {
      this.delete(`page-content:${path}`);
    }
    this.delete('page-list');
    this.delete('page-hierarchy');
  }
}

class FileCacheService extends CacheService {
  constructor() {
    super(30, 15 * 60 * 1000); // 30 files, 15 minutes TTL
  }

  /**
   * Cache file list
   */
  setFileList(files: FileInfo[]): void {
    this.set('file-list', files, 5 * 60 * 1000);
  }

  /**
   * Get cached file list
   */
  getFileList(): FileInfo[] | null {
    return this.get<FileInfo[]>('file-list');
  }

  /**
   * Cache file URL
   */
  setFileUrl(fileId: string, url: string): void {
    this.set(`file-url:${fileId}`, url, 30 * 60 * 1000); // 30 minutes for URLs
  }

  /**
   * Get cached file URL
   */
  getFileUrl(fileId: string): string | null {
    return this.get<string>(`file-url:${fileId}`);
  }

  /**
   * Cache file references
   */
  setFileReferences(fileId: string, references: string[]): void {
    this.set(`file-refs:${fileId}`, references, 10 * 60 * 1000);
  }

  /**
   * Get cached file references
   */
  getFileReferences(fileId: string): string[] | null {
    return this.get<string[]>(`file-refs:${fileId}`);
  }

  /**
   * Invalidate file-related caches
   */
  invalidateFileCaches(fileId?: string): void {
    if (fileId) {
      this.delete(`file-url:${fileId}`);
      this.delete(`file-refs:${fileId}`);
    }
    this.delete('file-list');
  }
}

class ConfigCacheService extends CacheService {
  constructor() {
    super(10, 30 * 60 * 1000); // 10 configs, 30 minutes TTL
  }

  /**
   * Cache wiki configuration
   */
  setWikiConfig(config: WikiConfig): void {
    this.set('wiki-config', config, 60 * 60 * 1000); // 1 hour TTL
  }

  /**
   * Get cached wiki configuration
   */
  getWikiConfig(): WikiConfig | null {
    return this.get<WikiConfig>('wiki-config');
  }

  /**
   * Invalidate configuration cache
   */
  invalidateConfig(): void {
    this.delete('wiki-config');
  }
}

// Prefetch service for proactive loading
class PrefetchService {
  private prefetchQueue = new Set<string>();
  private prefetchInProgress = new Set<string>();
  private maxConcurrentPrefetch = 3;

  constructor(
    private pageCache: PageCacheService,
    private fileCache: FileCacheService
  ) {}

  /**
   * Add page to prefetch queue
   */
  prefetchPage(path: string): void {
    if (!this.pageCache.has(`page-content:${path}`) && 
        !this.prefetchInProgress.has(path)) {
      this.prefetchQueue.add(path);
      this.processPrefetchQueue();
    }
  }

  /**
   * Add file to prefetch queue
   */
  prefetchFile(fileId: string): void {
    if (!this.fileCache.has(`file-url:${fileId}`) && 
        !this.prefetchInProgress.has(fileId)) {
      this.prefetchQueue.add(fileId);
      this.processPrefetchQueue();
    }
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.prefetchInProgress.size >= this.maxConcurrentPrefetch) {
      return;
    }

    const item = this.prefetchQueue.values().next().value;
    if (!item) return;

    this.prefetchQueue.delete(item);
    this.prefetchInProgress.add(item);

    try {
      // Simulate prefetch operation
      // In real implementation, this would call the actual services
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn('Prefetch failed for:', item, error);
    } finally {
      this.prefetchInProgress.delete(item);
      
      // Process next item if queue is not empty
      if (this.prefetchQueue.size > 0) {
        setTimeout(() => this.processPrefetchQueue(), 50);
      }
    }
  }

  /**
   * Clear prefetch queue
   */
  clearQueue(): void {
    this.prefetchQueue.clear();
  }

  /**
   * Get prefetch status
   */
  getStatus() {
    return {
      queueSize: this.prefetchQueue.size,
      inProgress: this.prefetchInProgress.size
    };
  }
}

// Memory management utilities
class MemoryManager {
  private memoryThreshold = 50 * 1024 * 1024; // 50MB threshold
  private checkInterval = 30 * 1000; // Check every 30 seconds
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private caches: CacheService[]
  ) {
    this.startMonitoring();
  }

  /**
   * Get estimated memory usage
   */
  getEstimatedMemoryUsage(): number {
    // Rough estimation based on cache sizes
    return this.caches.reduce((total, cache) => {
      const stats = cache.getStats();
      return total + (stats.totalSize * 1024); // Assume 1KB per entry
    }, 0);
  }

  /**
   * Check if memory usage is above threshold
   */
  isMemoryPressure(): boolean {
    return this.getEstimatedMemoryUsage() > this.memoryThreshold;
  }

  /**
   * Perform memory cleanup
   */
  cleanup(): void {
    if (this.isMemoryPressure()) {
      // Clear least important caches first
      this.caches.forEach(cache => {
        const stats = cache.getStats();
        if (stats.totalSize > 20) { // If cache has more than 20 items
          // Clear half of the cache
          const keysToDelete = Math.floor(stats.totalSize / 2);
          for (let i = 0; i < keysToDelete; i++) {
            // This would need access to cache internals to implement properly
            // For now, just clear the entire cache if memory pressure is high
            cache.clear();
            break;
          }
        }
      });
    }
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    this.timer = setInterval(() => {
      this.cleanup();
    }, this.checkInterval);
  }

  /**
   * Stop memory monitoring
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

// Export singleton instances
export const pageCache = new PageCacheService();
export const fileCache = new FileCacheService();
export const configCache = new ConfigCacheService();
export const prefetchService = new PrefetchService(pageCache, fileCache);
export const memoryManager = new MemoryManager([pageCache, fileCache, configCache]);

// Export classes for testing
export { CacheService, PageCacheService, FileCacheService, ConfigCacheService, PrefetchService, MemoryManager };
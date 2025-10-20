/**
 * Route-based lazy loading configuration for optimal code splitting
 */

import { lazyComponent, preloadComponent } from '../utils/lazyLoad';

/**
 * Lazy loaded route components
 */
export const lazyRoutes = {
  // Admin routes - Heavy components, rarely accessed
  admin: {
    UserManagement: lazyComponent(
      () => import('../components/admin/UserManagement.svelte')
    ),
    SettingsManagement: lazyComponent(
      () => import('../components/admin/SettingsManagement.svelte')
    )
  },

  // Editor routes - Heavy but important components
  editor: {
    MarkdownEditor: lazyComponent(
      () => import('../components/editor/MarkdownEditor.svelte')
    ),
    PageEditor: lazyComponent(
      () => import('../components/editor/PageEditor.svelte')
    ),
    MarkdownPreview: lazyComponent(
      () => import('../components/editor/MarkdownPreview.svelte')
    )
  },

  // File management routes - Medium priority
  files: {
    FileManager: lazyComponent(
      () => import('../components/files/FileManager.svelte')
    ),
    FileUpload: lazyComponent(
      () => import('../components/files/FileUpload.svelte')
    ),
    FileDisplay: lazyComponent(
      () => import('../components/files/FileDisplay.svelte')
    ),
    OrphanedFilesCleaner: lazyComponent(
      () => import('../components/files/OrphanedFilesCleaner.svelte')
    ),
    FileReferenceTracker: lazyComponent(
      () => import('../components/files/FileReferenceTracker.svelte')
    )
  },

  // Browser routes - Medium priority
  browser: {
    PageBrowser: lazyComponent(
      () => import('../components/browser/PageBrowser.svelte')
    ),
    SearchInterface: lazyComponent(
      () => import('../components/browser/SearchInterface.svelte')
    ),
    PageBrowserLayout: lazyComponent(
      () => import('../components/browser/PageBrowserLayout.svelte')
    )
  },

  // Common components that might be lazy loaded
  common: {
    VirtualList: lazyComponent(
      () => import('../components/common/VirtualList.svelte')
    ),
    LazyImage: lazyComponent(
      () => import('../components/common/LazyImage.svelte')
    )
  }
};

/**
 * Preloading strategies based on user behavior and route patterns
 */
export const preloadStrategies = {
  /**
   * Preload components based on current route
   */
  preloadForRoute(pathname: string) {
    if (pathname.includes('/admin')) {
      // Preload admin components
      preloadComponent(() => import('../components/admin/UserManagement.svelte'));
      preloadComponent(() => import('../components/admin/SettingsManagement.svelte'));
    } else if (pathname.includes('/edit')) {
      // Preload editor components
      preloadComponent(() => import('../components/editor/MarkdownEditor.svelte'));
      preloadComponent(() => import('../components/editor/PageEditor.svelte'));
    } else if (pathname.includes('/browse')) {
      // Preload browser components
      preloadComponent(() => import('../components/browser/PageBrowser.svelte'));
      preloadComponent(() => import('../components/browser/SearchInterface.svelte'));
    } else if (pathname.includes('/files')) {
      // Preload file management components
      preloadComponent(() => import('../components/files/FileManager.svelte'));
      preloadComponent(() => import('../components/files/FileUpload.svelte'));
    }
  },

  /**
   * Preload components on user interaction hints
   */
  preloadOnHover(componentName: keyof typeof lazyRoutes) {
    const category = Object.keys(lazyRoutes).find(key => 
      componentName in (lazyRoutes as any)[key]
    );
    
    if (category) {
      const component = (lazyRoutes as any)[category][componentName];
      if (component && !component.isLoaded) {
        component.load().catch(() => {
          // Silently ignore preload failures
        });
      }
    }
  },

  /**
   * Preload critical components after initial page load
   */
  preloadCritical() {
    // Use requestIdleCallback for non-blocking preloading
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // Preload authentication components (likely to be needed)
        preloadComponent(() => import('../components/auth/LoginForm.svelte'));
        
        // Preload navigation (always visible)
        preloadComponent(() => import('../components/common/Navigation.svelte'));
        
        // Preload common utilities
        preloadComponent(() => import('../components/common/LazyImage.svelte'));
      });
    }
  },

  /**
   * Intelligent preloading based on user behavior patterns
   */
  intelligentPreload() {
    // Track user interactions to predict next actions
    const interactions = {
      editClicks: 0,
      browseClicks: 0,
      fileClicks: 0,
      adminClicks: 0
    };

    // Listen for navigation hints
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link) {
        const href = link.getAttribute('href') || '';
        
        if (href.includes('/edit')) {
          interactions.editClicks++;
          if (interactions.editClicks > 2) {
            preloadComponent(() => import('../components/editor/MarkdownEditor.svelte'));
          }
        } else if (href.includes('/browse')) {
          interactions.browseClicks++;
          if (interactions.browseClicks > 2) {
            preloadComponent(() => import('../components/browser/PageBrowser.svelte'));
          }
        } else if (href.includes('/files')) {
          interactions.fileClicks++;
          if (interactions.fileClicks > 2) {
            preloadComponent(() => import('../components/files/FileManager.svelte'));
          }
        } else if (href.includes('/admin')) {
          interactions.adminClicks++;
          if (interactions.adminClicks > 1) {
            preloadComponent(() => import('../components/admin/UserManagement.svelte'));
          }
        }
      }
    });
  }
};

/**
 * Initialize preloading strategies
 */
export function initializePreloading() {
  // Preload critical components
  preloadStrategies.preloadCritical();
  
  // Set up intelligent preloading
  preloadStrategies.intelligentPreload();
  
  // Preload based on current route
  preloadStrategies.preloadForRoute(window.location.pathname);
}

/**
 * Route-specific chunk priorities for loading optimization
 */
export const chunkPriorities = {
  // High priority - Core functionality
  high: [
    'core-services',
    'aws-credentials',
    'polyfills'
  ],
  
  // Medium priority - Common features
  medium: [
    'aws-s3',
    'aws-cognito-identity',
    'security',
    'vendor'
  ],
  
  // Low priority - Advanced features
  low: [
    'admin-components',
    'admin-services',
    'milkdown',
    'file-components',
    'browser-components'
  ]
};

/**
 * Dynamic import with priority and retry logic
 */
export async function importWithPriority<T>(
  importFn: () => Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'medium',
  retries = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < retries; i++) {
    try {
      // Add delay for low priority imports to avoid blocking
      if (priority === 'low' && i === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return await importFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Import failed');
      
      // Exponential backoff for retries
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError!;
}
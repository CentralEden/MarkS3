/**
 * Lazy loading utilities for code splitting and performance optimization
 */

import type { ComponentType } from 'svelte';

/**
 * Lazy load a Svelte component with loading state
 */
export function lazyComponent<T extends ComponentType>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ComponentType
) {
  let component: T | null = null;
  let loading = false;
  let error: Error | null = null;

  return {
    async load(): Promise<T> {
      if (component) return component;
      if (loading) {
        // Wait for existing load to complete
        while (loading) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        if (component) return component;
        if (error) throw error;
      }

      loading = true;
      error = null;

      try {
        const module = await importFn();
        component = module.default;
        return component;
      } catch (err) {
        error = err instanceof Error ? err : new Error('Failed to load component');
        throw error;
      } finally {
        loading = false;
      }
    },

    get isLoaded() {
      return component !== null;
    },

    get isLoading() {
      return loading;
    },

    get error() {
      return error;
    },

    fallback
  };
}

/**
 * Lazy load a service or utility module
 */
export function lazyModule<T>(
  importFn: () => Promise<T>
): Promise<T> {
  return importFn();
}

/**
 * Preload a component or module for better UX
 */
export function preloadComponent<T extends ComponentType>(
  importFn: () => Promise<{ default: T }>
): void {
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      importFn().catch(() => {
        // Silently ignore preload failures
      });
    });
  } else {
    setTimeout(() => {
      importFn().catch(() => {
        // Silently ignore preload failures
      });
    }, 100);
  }
}

/**
 * Intersection Observer based lazy loading for components
 */
export function createIntersectionLazyLoader<T extends ComponentType>(
  importFn: () => Promise<{ default: T }>,
  options: IntersectionObserverInit = {}
) {
  const defaultOptions: IntersectionObserverInit = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };

  return {
    observe(element: Element, callback: (component: T) => void) {
      const observer = new IntersectionObserver(
        async (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              observer.unobserve(entry.target);
              try {
                const module = await importFn();
                callback(module.default);
              } catch (error) {
                console.error('Failed to lazy load component:', error);
              }
            }
          }
        },
        defaultOptions
      );

      observer.observe(element);
      return observer;
    }
  };
}

/**
 * Route-based code splitting helper
 */
export const routeComponents = {
  // Admin components (heavy, rarely used)
  UserManagement: lazyComponent(
    () => import('../components/admin/UserManagement.svelte')
  ),
  SettingsManagement: lazyComponent(
    () => import('../components/admin/SettingsManagement.svelte')
  ),

  // Editor components (heavy, but important)
  MarkdownEditor: lazyComponent(
    () => import('../components/editor/MarkdownEditor.svelte')
  ),
  PageEditor: lazyComponent(
    () => import('../components/editor/PageEditor.svelte')
  ),

  // File management components (medium priority)
  FileManager: lazyComponent(
    () => import('../components/files/FileManager.svelte')
  ),
  FileUpload: lazyComponent(
    () => import('../components/files/FileUpload.svelte')
  ),
  OrphanedFilesCleaner: lazyComponent(
    () => import('../components/files/OrphanedFilesCleaner.svelte')
  ),

  // Browser components (medium priority)
  PageBrowser: lazyComponent(
    () => import('../components/browser/PageBrowser.svelte')
  ),
  SearchInterface: lazyComponent(
    () => import('../components/browser/SearchInterface.svelte')
  )
};

/**
 * Service-based code splitting
 */
export const lazyServices = {
  // AWS SDK services (heavy)
  s3Service: () => lazyModule(() => import('../services/s3')),
  authService: () => lazyModule(() => import('../services/auth')),
  
  // File operations (medium)
  fileService: () => lazyModule(() => import('../services/files')),
  
  // User management (rarely used)
  userManagement: () => lazyModule(() => import('../services/userManagement')),
  configManagement: () => lazyModule(() => import('../services/configManagement'))
};

/**
 * Preload critical components for better perceived performance
 */
export function preloadCriticalComponents() {
  // Preload components likely to be used soon
  preloadComponent(() => import('../components/auth/LoginForm.svelte'));
  preloadComponent(() => import('../components/common/Navigation.svelte'));
  
  // Preload editor if user is likely to edit
  if (window.location.pathname.includes('/edit')) {
    preloadComponent(() => import('../components/editor/MarkdownEditor.svelte'));
  }
  
  // Preload browser if user is likely to browse
  if (window.location.pathname.includes('/browse')) {
    preloadComponent(() => import('../components/browser/PageBrowser.svelte'));
  }
}
/**
 * Authentication Store
 * Manages authentication state using Svelte stores
 */

import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import type { User, UserRole, AuthResult } from '../types/auth.js';
import { authService } from '../services/auth.js';
import { WikiError, ErrorCodes } from '../types/errors.js';

// Authentication state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check for existing session
  error: null
};

// Create writable store for auth state
const authState: Writable<AuthState> = writable(initialState);

// Derived stores for convenient access
export const user: Readable<User | null> = derived(authState, $state => $state.user);
export const isAuthenticated: Readable<boolean> = derived(authState, $state => $state.isAuthenticated);
export const isLoading: Readable<boolean> = derived(authState, $state => $state.isLoading);
export const authError: Readable<string | null> = derived(authState, $state => $state.error);
export const userRole: Readable<UserRole | null> = derived(user, $user => $user?.role || null);

// Derived stores for permission checking
export const canRead: Readable<boolean> = derived(
  [isAuthenticated, user], 
  ([$isAuthenticated, $user]) => {
    if ($isAuthenticated && $user) {
      return authService.checkPermission('read');
    }
    // Check if guest access is allowed (will be implemented with config)
    return authService.checkGuestAccess();
  }
);

export const canWrite: Readable<boolean> = derived(
  [isAuthenticated, user], 
  ([$isAuthenticated, $user]) => {
    return $isAuthenticated && $user ? authService.checkPermission('write') : false;
  }
);

export const canDelete: Readable<boolean> = derived(
  [isAuthenticated, user], 
  ([$isAuthenticated, $user]) => {
    return $isAuthenticated && $user ? authService.checkPermission('delete') : false;
  }
);

export const canUpload: Readable<boolean> = derived(
  [isAuthenticated, user], 
  ([$isAuthenticated, $user]) => {
    return $isAuthenticated && $user ? authService.checkPermission('upload') : false;
  }
);

export const isAdmin: Readable<boolean> = derived(
  [isAuthenticated, user], 
  ([$isAuthenticated, $user]) => {
    return $isAuthenticated && $user ? authService.checkPermission('admin') : false;
  }
);

// Auth store actions
export const authStore = {
  // Subscribe to the store
  subscribe: authState.subscribe,

  /**
   * Initialize the auth store - check for existing session
   */
  async init(): Promise<void> {
    authState.update(state => ({ ...state, isLoading: true, error: null }));

    try {
      const currentUser = await authService.getCurrentUser();
      
      authState.update(state => ({
        ...state,
        user: currentUser,
        isAuthenticated: !!currentUser,
        isLoading: false,
        error: null
      }));

      // Set up automatic token refresh if user is authenticated
      if (currentUser) {
        this.setupTokenRefresh();
      }

    } catch (error) {
      console.error('Auth initialization error:', error);
      authState.update(state => ({
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize authentication'
      }));
    }
  },

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<AuthResult> {
    authState.update(state => ({ ...state, isLoading: true, error: null }));

    try {
      const result = await authService.login(username, password);

      if (result.success && result.user) {
        authState.update(state => ({
          ...state,
          user: result.user!,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }));

        // Set up automatic token refresh
        this.setupTokenRefresh();
      } else {
        authState.update(state => ({
          ...state,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: result.error || 'Login failed'
        }));
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      authState.update(state => ({
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage
      }));

      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    authState.update(state => ({ ...state, isLoading: true }));

    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token refresh interval
      this.clearTokenRefresh();

      // Reset auth state
      authState.update(state => ({
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }));
    }
  },

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const newToken = await authService.refreshToken();
      const currentUser = await authService.getCurrentUser();

      authState.update(state => ({
        ...state,
        user: currentUser,
        isAuthenticated: !!currentUser,
        error: null
      }));

      return true;

    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // If refresh fails, logout the user
      await this.logout();
      return false;
    }
  },

  /**
   * Clear any authentication errors
   */
  clearError(): void {
    authState.update(state => ({ ...state, error: null }));
  },

  /**
   * Check if user has specific permission
   */
  hasPermission(action: string): boolean {
    const currentState = get(authState);
    if (!currentState.isAuthenticated || !currentState.user) {
      return false;
    }
    return authService.checkPermission(action);
  },

  /**
   * Get current user role
   */
  getUserRole(): UserRole | null {
    const currentState = get(authState);
    return currentState.user?.role || null;
  },

  // Token refresh management
  tokenRefreshInterval: null as ReturnType<typeof setInterval> | null,

  /**
   * Set up automatic token refresh
   */
  setupTokenRefresh(): void {
    // Clear any existing interval
    this.clearTokenRefresh();

    // Set up token refresh every 45 minutes (tokens typically expire in 1 hour)
    this.tokenRefreshInterval = setInterval(async () => {
      const currentState = get(authState);
      if (currentState.isAuthenticated) {
        try {
          await authStore.refreshToken();
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
          // The refreshToken method will handle logout on failure
        }
      }
    }, 45 * 60 * 1000); // 45 minutes
  },

  /**
   * Clear token refresh interval
   */
  clearTokenRefresh(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }
};

// Initialize auth store when module loads (browser only)
if (typeof window !== 'undefined') {
  authStore.init().catch(error => {
    console.error('Failed to initialize auth store:', error);
  });
}

// Export the main auth state store
export default authState;
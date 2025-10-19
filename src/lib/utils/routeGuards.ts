/**
 * Route Guards
 * Utilities for protecting routes based on authentication and permissions
 */

import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { authStore, isAuthenticated, isAdmin, canWrite, canRead } from '../stores/auth.js';
import type { UserRole } from '../types/auth.js';

export interface RouteGuardOptions {
  requireAuth?: boolean;
  allowGuestAccess?: boolean;
  requiredRole?: UserRole;
  requiredPermission?: string;
  redirectTo?: string;
}

/**
 * Check if user can access a route based on guard options
 */
export function canAccessRoute(options: RouteGuardOptions = {}): boolean {
  const {
    requireAuth = false,
    allowGuestAccess = false,
    requiredRole,
    requiredPermission
  } = options;

  const $isAuthenticated = get(isAuthenticated);
  const $canRead = get(canRead);

  // If authentication is required and user is not authenticated
  if (requireAuth && !$isAuthenticated) {
    return false;
  }

  // If guest access is not allowed and user is not authenticated
  if (!allowGuestAccess && !$isAuthenticated) {
    return false;
  }

  // If user is not authenticated but guest access is allowed
  if (!$isAuthenticated && allowGuestAccess) {
    // Check if guest can read (based on wiki configuration)
    return $canRead;
  }

  // If specific role is required
  if (requiredRole) {
    const userRole = authStore.getUserRole();
    if (userRole !== requiredRole && !(requiredRole === 'regular' && userRole === 'admin')) {
      return false;
    }
  }

  // If specific permission is required
  if (requiredPermission) {
    if (!authStore.hasPermission(requiredPermission)) {
      return false;
    }
  }

  return true;
}

/**
 * Guard a route and redirect if access is denied
 */
export async function guardRoute(options: RouteGuardOptions = {}): Promise<boolean> {
  const { redirectTo = '/' } = options;

  if (!canAccessRoute(options)) {
    await goto(redirectTo);
    return false;
  }

  return true;
}

/**
 * Route guard for pages that require authentication
 */
export async function requireAuth(redirectTo = '/'): Promise<boolean> {
  return guardRoute({ requireAuth: true, redirectTo });
}

/**
 * Route guard for pages that require write permissions
 */
export async function requireWrite(redirectTo = '/'): Promise<boolean> {
  return guardRoute({ requireAuth: true, requiredPermission: 'write', redirectTo });
}

/**
 * Route guard for admin-only pages
 */
export async function requireAdmin(redirectTo = '/'): Promise<boolean> {
  return guardRoute({ requireAuth: true, requiredPermission: 'admin', redirectTo });
}

/**
 * Route guard for pages that allow guest access
 */
export async function allowGuests(): Promise<boolean> {
  return guardRoute({ allowGuestAccess: true });
}

/**
 * Get route configuration for different page types
 */
export const routeConfigs = {
  home: {
    allowGuestAccess: true,
    requireAuth: false
  },
  browse: {
    allowGuestAccess: true,
    requireAuth: false
  },
  edit: {
    requireAuth: true,
    requiredPermission: 'write'
  },
  admin: {
    requireAuth: true,
    requiredPermission: 'admin'
  },
  files: {
    requireAuth: true,
    requiredPermission: 'upload'
  }
} as const;

/**
 * Check if current user can access a specific route type
 */
export function canAccessRouteType(routeType: keyof typeof routeConfigs): boolean {
  return canAccessRoute(routeConfigs[routeType]);
}
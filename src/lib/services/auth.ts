/**
 * AWS Cognito Authentication Service
 * Handles user authentication, token management, and role-based permissions
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  type InitiateAuthCommandInput,
  type AuthFlowType
} from '@aws-sdk/client-cognito-identity-provider';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import type { User, AuthResult, AuthService as IAuthService } from '../types/auth.js';
import { UserRole } from '../types/auth.js';
import type { AWSConfig } from '../types/aws.js';
import { WikiError, ErrorCodes } from '../types/errors.js';
import { getAWSConfig } from '../config/app.js';
import { executeWithRetry, AWSService, createUserFriendlyError } from '../utils/awsErrorHandler.js';

export class AuthService implements IAuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private config: AWSConfig;
  private currentUser: User | null = null;
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private idToken: string | null = null;

  constructor() {
    this.config = getAWSConfig();
    
    // Initialize Cognito client with browser-compatible configuration
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.config.region,
      // Browser-specific configuration
      requestHandler: {
        requestTimeout: 30000,
        // Remove Node.js specific httpsAgent
        httpsAgent: undefined
      },
      // Use browser-compatible credentials when available
      credentials: typeof window !== 'undefined' ? fromCognitoIdentityPool({
        clientConfig: { region: this.config.region },
        identityPoolId: this.config.cognitoIdentityPoolId
      }) : undefined,
      // Ensure proper browser compatibility
      runtime: 'browser',
      // Add retry configuration for network resilience
      maxAttempts: 3,
      retryMode: 'adaptive'
    });
    
    // Try to restore session from localStorage
    this.restoreSession();
  }

  /**
   * Authenticate user with username and password
   */
  async login(username: string, password: string): Promise<AuthResult> {
    try {
      const authParams: InitiateAuthCommandInput = {
        AuthFlow: 'USER_PASSWORD_AUTH' as AuthFlowType,
        ClientId: this.config.cognitoClientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      };

      const command = new InitiateAuthCommand(authParams);
      const response = await executeWithRetry(
        () => this.cognitoClient.send(command),
        AWSService.COGNITO
      );

      if (!response.AuthenticationResult) {
        throw new WikiError(
          ErrorCodes.AUTH_FAILED,
          'Authentication failed - no result returned'
        );
      }

      const { AccessToken, RefreshToken, IdToken } = response.AuthenticationResult;

      if (!AccessToken || !RefreshToken || !IdToken) {
        throw new WikiError(
          ErrorCodes.AUTH_FAILED,
          'Authentication failed - missing tokens'
        );
      }

      // Store tokens
      this.accessToken = AccessToken;
      this.refreshTokenValue = RefreshToken;
      this.idToken = IdToken;

      // Get user information with retry
      const user = await this.fetchUserInfo(AccessToken);
      this.currentUser = user;

      // Persist session
      this.persistSession();

      return {
        success: true,
        user,
        token: AccessToken
      };

    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof WikiError) {
        return {
          success: false,
          error: error.message
        };
      }

      // Use centralized error handling for user-friendly messages
      const friendlyError = createUserFriendlyError(error, AWSService.COGNITO);
      return {
        success: false,
        error: friendlyError.message
      };
    }
  }

  /**
   * Sign out the current user
   */
  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        const command = new GlobalSignOutCommand({
          AccessToken: this.accessToken
        });
        await executeWithRetry(
          () => this.cognitoClient.send(command),
          AWSService.COGNITO
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if server logout fails
      // This is acceptable as the tokens will expire anyway
    } finally {
      // Clear local session
      this.clearSession();
    }
  }

  /**
   * Get the currently authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser && this.accessToken) {
      try {
        // Verify token is still valid by making a test call
        await this.fetchUserInfo(this.accessToken);
        return this.currentUser;
      } catch (error) {
        // Token might be expired, try to refresh
        try {
          await this.refreshAccessToken();
          return this.currentUser;
        } catch (refreshError) {
          // Refresh failed, clear session
          this.clearSession();
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshToken(): Promise<string> {
    return this.refreshAccessToken();
  }

  /**
   * Internal method to refresh the access token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshTokenValue) {
      throw new WikiError(
        ErrorCodes.AUTH_FAILED,
        'No refresh token available'
      );
    }

    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH' as AuthFlowType,
        ClientId: this.config.cognitoClientId,
        AuthParameters: {
          REFRESH_TOKEN: this.refreshTokenValue
        }
      });

      const response = await executeWithRetry(
        () => this.cognitoClient.send(command),
        AWSService.COGNITO
      );

      if (!response.AuthenticationResult?.AccessToken) {
        throw new WikiError(
          ErrorCodes.AUTH_FAILED,
          'Token refresh failed'
        );
      }

      this.accessToken = response.AuthenticationResult.AccessToken;
      
      // Update ID token if provided
      if (response.AuthenticationResult.IdToken) {
        this.idToken = response.AuthenticationResult.IdToken;
      }

      // Update user info with retry
      if (this.accessToken) {
        this.currentUser = await this.fetchUserInfo(this.accessToken);
        this.persistSession();
      }

      return this.accessToken;

    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearSession();
      throw new WikiError(
        ErrorCodes.AUTH_FAILED,
        'Failed to refresh authentication token. Please log in again.'
      );
    }
  }

  /**
   * Check if the current user has permission to perform an action
   */
  checkPermission(action: string): boolean {
    if (!this.currentUser) {
      return false;
    }

    const role = this.currentUser.role;

    switch (action) {
      case 'read':
        // All authenticated users can read
        return true;
      
      case 'write':
      case 'edit':
      case 'create':
        // Regular users and admins can write/edit
        return role === UserRole.REGULAR || role === UserRole.ADMIN;
      
      case 'delete':
        // Regular users and admins can delete pages
        return role === UserRole.REGULAR || role === UserRole.ADMIN;
      
      case 'admin':
      case 'user_management':
      case 'config':
        // Only admins can perform admin actions
        return role === UserRole.ADMIN;
      
      case 'upload':
        // Regular users and admins can upload files
        return role === UserRole.REGULAR || role === UserRole.ADMIN;
      
      default:
        return false;
    }
  }

  /**
   * Check if guest access is allowed for read operations
   */
  checkGuestAccess(): boolean {
    // This will be determined by the wiki configuration
    // For now, return false - will be implemented when config service is ready
    return false;
  }

  /**
   * Set guest access status (used by config service)
   */
  setGuestAccess(allowed: boolean): void {
    // This will be called by the config service when guest access setting changes
    // For now, we'll implement this as a simple property
    // In a full implementation, this would integrate with the config service
  }

  /**
   * Get the current user's role
   */
  getCurrentUserRole(): UserRole | null {
    return this.currentUser?.role || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.currentUser && this.accessToken);
  }

  /**
   * Fetch user information from Cognito
   */
  private async fetchUserInfo(accessToken: string): Promise<User> {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken
      });

      const response = await executeWithRetry(
        () => this.cognitoClient.send(command),
        AWSService.COGNITO
      );

      if (!response.Username) {
        throw new WikiError(
          ErrorCodes.AUTH_FAILED,
          'Failed to get user information'
        );
      }

      // Extract user attributes
      const attributes = response.UserAttributes || [];
      const email = attributes.find(attr => attr.Name === 'email')?.Value || '';
      const roleAttr = attributes.find(attr => attr.Name === 'custom:role')?.Value || 'regular';

      // Map role string to UserRole enum
      let role: UserRole;
      switch (roleAttr.toLowerCase()) {
        case 'admin':
          role = UserRole.ADMIN;
          break;
        case 'regular':
          role = UserRole.REGULAR;
          break;
        case 'guest':
          role = UserRole.GUEST;
          break;
        default:
          role = UserRole.REGULAR; // Default to regular user
      }

      return {
        id: response.Username,
        username: response.Username,
        email,
        role
      };

    } catch (error) {
      console.error('Error fetching user info:', error);
      throw new WikiError(
        ErrorCodes.AUTH_FAILED,
        'Failed to retrieve user information. Please try again.'
      );
    }
  }

  /**
   * Persist session to localStorage
   */
  private persistSession(): void {
    if (typeof window !== 'undefined') {
      const sessionData = {
        accessToken: this.accessToken,
        refreshToken: this.refreshTokenValue,
        idToken: this.idToken,
        user: this.currentUser
      };
      
      localStorage.setItem('marks3_session', JSON.stringify(sessionData));
    }
  }

  /**
   * Restore session from localStorage
   */
  private restoreSession(): void {
    if (typeof window !== 'undefined') {
      try {
        const sessionData = localStorage.getItem('marks3_session');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          this.accessToken = parsed.accessToken;
          this.refreshTokenValue = parsed.refreshToken;
          this.idToken = parsed.idToken;
          this.currentUser = parsed.user;
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        this.clearSession();
      }
    }
  }

  /**
   * Clear session data
   */
  private clearSession(): void {
    this.accessToken = null;
    this.refreshTokenValue = null;
    this.idToken = null;
    this.currentUser = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('marks3_session');
    }
  }


}

// Export singleton instance
export const authService = new AuthService();
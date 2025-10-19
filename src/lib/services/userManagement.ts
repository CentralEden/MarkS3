/**
 * User Management Service
 * Handles admin operations for user management
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminGetUserCommand,
  type UserType,
  type AttributeType
} from '@aws-sdk/client-cognito-identity-provider';
import type { User, UserRole } from '../types/auth.js';
import { UserRole as UserRoleEnum } from '../types/auth.js';
import { WikiError, ErrorCodes } from '../types/errors.js';
import { getAWSConfig } from '../config/app.js';
import type { AWSConfig } from '../types/aws.js';

export interface CreateUserRequest {
  username: string;
  email: string;
  role: UserRole;
  temporaryPassword?: string;
}

export interface UpdateUserRequest {
  username: string;
  email?: string;
  role?: UserRole;
}

export interface UserManagementService {
  listUsers(): Promise<User[]>;
  createUser(request: CreateUserRequest): Promise<User>;
  updateUser(request: UpdateUserRequest): Promise<User>;
  deleteUser(username: string): Promise<void>;
  getUserDetails(username: string): Promise<User>;
}

export class CognitoUserManagementService implements UserManagementService {
  private cognitoClient: CognitoIdentityProviderClient;
  private config: AWSConfig;

  constructor() {
    this.config = getAWSConfig();
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.config.region,
      requestHandler: {
        requestTimeout: 30000,
        httpsAgent: undefined
      }
    });
  }

  /**
   * List all users in the Cognito User Pool
   */
  async listUsers(): Promise<User[]> {
    try {
      const command = new ListUsersCommand({
        UserPoolId: this.config.cognitoUserPoolId,
        Limit: 60 // Maximum allowed by Cognito
      });

      const response = await this.cognitoClient.send(command);
      const users: User[] = [];

      if (response.Users) {
        for (const cognitoUser of response.Users) {
          const user = this.mapCognitoUserToUser(cognitoUser);
          if (user) {
            users.push(user);
          }
        }
      }

      return users;

    } catch (error) {
      console.error('Error listing users:', error);
      throw new WikiError(
        ErrorCodes.PERMISSION_DENIED,
        'Failed to list users. Check your admin permissions.'
      );
    }
  }

  /**
   * Create a new user in the Cognito User Pool
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    try {
      const userAttributes: AttributeType[] = [
        {
          Name: 'email',
          Value: request.email
        },
        {
          Name: 'email_verified',
          Value: 'true'
        },
        {
          Name: 'custom:role',
          Value: request.role
        }
      ];

      const command = new AdminCreateUserCommand({
        UserPoolId: this.config.cognitoUserPoolId,
        Username: request.username,
        UserAttributes: userAttributes,
        TemporaryPassword: request.temporaryPassword || this.generateTemporaryPassword(),
        MessageAction: 'SUPPRESS' // Don't send welcome email for now
      });

      const response = await this.cognitoClient.send(command);

      if (!response.User) {
        throw new WikiError(
          ErrorCodes.CONFIG_ERROR,
          'Failed to create user - no user data returned'
        );
      }

      const user = this.mapCognitoUserToUser(response.User);
      if (!user) {
        throw new WikiError(
          ErrorCodes.CONFIG_ERROR,
          'Failed to parse created user data'
        );
      }

      return user;

    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error instanceof WikiError) {
        throw error;
      }

      throw new WikiError(
        ErrorCodes.CONFIG_ERROR,
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update an existing user's attributes
   */
  async updateUser(request: UpdateUserRequest): Promise<User> {
    try {
      const userAttributes: AttributeType[] = [];

      if (request.email) {
        userAttributes.push({
          Name: 'email',
          Value: request.email
        });
      }

      if (request.role) {
        userAttributes.push({
          Name: 'custom:role',
          Value: request.role
        });
      }

      if (userAttributes.length > 0) {
        const command = new AdminUpdateUserAttributesCommand({
          UserPoolId: this.config.cognitoUserPoolId,
          Username: request.username,
          UserAttributes: userAttributes
        });

        await this.cognitoClient.send(command);
      }

      // Get updated user details
      return await this.getUserDetails(request.username);

    } catch (error) {
      console.error('Error updating user:', error);
      throw new WikiError(
        ErrorCodes.CONFIG_ERROR,
        `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a user from the Cognito User Pool
   */
  async deleteUser(username: string): Promise<void> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.config.cognitoUserPoolId,
        Username: username
      });

      await this.cognitoClient.send(command);

    } catch (error) {
      console.error('Error deleting user:', error);
      throw new WikiError(
        ErrorCodes.CONFIG_ERROR,
        `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get detailed information about a specific user
   */
  async getUserDetails(username: string): Promise<User> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.config.cognitoUserPoolId,
        Username: username
      });

      const response = await this.cognitoClient.send(command);

      if (!response.Username) {
        throw new WikiError(
          ErrorCodes.CONFIG_ERROR,
          'User not found'
        );
      }

      // Map response to User interface
      const attributes = response.UserAttributes || [];
      const email = attributes.find(attr => attr.Name === 'email')?.Value || '';
      const roleAttr = attributes.find(attr => attr.Name === 'custom:role')?.Value || 'regular';

      let role: UserRole;
      switch (roleAttr.toLowerCase()) {
        case 'admin':
          role = UserRoleEnum.ADMIN;
          break;
        case 'regular':
          role = UserRoleEnum.REGULAR;
          break;
        case 'guest':
          role = UserRoleEnum.GUEST;
          break;
        default:
          role = UserRoleEnum.REGULAR;
      }

      return {
        id: response.Username,
        username: response.Username,
        email,
        role
      };

    } catch (error) {
      console.error('Error getting user details:', error);
      throw new WikiError(
        ErrorCodes.CONFIG_ERROR,
        `Failed to get user details: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Map Cognito UserType to our User interface
   */
  private mapCognitoUserToUser(cognitoUser: UserType): User | null {
    if (!cognitoUser.Username) {
      return null;
    }

    const attributes = cognitoUser.Attributes || [];
    const email = attributes.find(attr => attr.Name === 'email')?.Value || '';
    const roleAttr = attributes.find(attr => attr.Name === 'custom:role')?.Value || 'regular';

    let role: UserRole;
    switch (roleAttr.toLowerCase()) {
      case 'admin':
        role = UserRoleEnum.ADMIN;
        break;
      case 'regular':
        role = UserRoleEnum.REGULAR;
        break;
      case 'guest':
        role = UserRoleEnum.GUEST;
        break;
      default:
        role = UserRoleEnum.REGULAR;
    }

    return {
      id: cognitoUser.Username,
      username: cognitoUser.Username,
      email,
      role
    };
  }

  /**
   * Generate a temporary password for new users
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    password += 'A'; // uppercase
    password += 'a'; // lowercase
    password += '1'; // number
    password += '!'; // special character
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

// Export singleton instance
export const userManagementService = new CognitoUserManagementService();
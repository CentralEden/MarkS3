/**
 * User Management Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CognitoUserManagementService } from './userManagement.js';
import { UserRole } from '../types/auth.js';
import { WikiError, ErrorCodes } from '../types/errors.js';

// Mock AWS SDK
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: vi.fn()
  })),
  ListUsersCommand: vi.fn(),
  AdminCreateUserCommand: vi.fn(),
  AdminDeleteUserCommand: vi.fn(),
  AdminUpdateUserAttributesCommand: vi.fn(),
  AdminGetUserCommand: vi.fn()
}));

// Mock AWS config
vi.mock('../config/app.js', () => ({
  getAWSConfig: vi.fn().mockReturnValue({
    region: 'us-east-1',
    cognitoUserPoolId: 'test-pool-id',
    cognitoIdentityPoolId: 'test-identity-pool-id',
    bucketName: 'test-bucket'
  })
}));

describe('CognitoUserManagementService', () => {
  let userService: CognitoUserManagementService;
  let mockCognitoClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new CognitoUserManagementService();
    mockCognitoClient = (userService as any).cognitoClient;
  });

  describe('listUsers', () => {
    it('should list users successfully', async () => {
      const mockUsers = [
        {
          Username: 'testuser1',
          Attributes: [
            { Name: 'email', Value: 'test1@example.com' },
            { Name: 'custom:role', Value: 'regular' }
          ]
        },
        {
          Username: 'admin1',
          Attributes: [
            { Name: 'email', Value: 'admin@example.com' },
            { Name: 'custom:role', Value: 'admin' }
          ]
        }
      ];

      mockCognitoClient.send.mockResolvedValue({
        Users: mockUsers
      });

      const users = await userService.listUsers();

      expect(users).toHaveLength(2);
      expect(users[0]).toEqual({
        id: 'testuser1',
        username: 'testuser1',
        email: 'test1@example.com',
        role: UserRole.REGULAR
      });
      expect(users[1]).toEqual({
        id: 'admin1',
        username: 'admin1',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      });
    });

    it('should handle empty user list', async () => {
      mockCognitoClient.send.mockResolvedValue({
        Users: []
      });

      const users = await userService.listUsers();
      expect(users).toHaveLength(0);
    });

    it('should handle Cognito errors', async () => {
      mockCognitoClient.send.mockRejectedValue(new Error('Access denied'));

      await expect(userService.listUsers()).rejects.toThrow(WikiError);
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const createRequest = {
        username: 'newuser',
        email: 'newuser@example.com',
        role: UserRole.REGULAR
      };

      const mockCreatedUser = {
        Username: 'newuser',
        Attributes: [
          { Name: 'email', Value: 'newuser@example.com' },
          { Name: 'custom:role', Value: 'regular' }
        ]
      };

      mockCognitoClient.send.mockResolvedValue({
        User: mockCreatedUser
      });

      const user = await userService.createUser(createRequest);

      expect(user).toEqual({
        id: 'newuser',
        username: 'newuser',
        email: 'newuser@example.com',
        role: UserRole.REGULAR
      });
    });

    it('should create user with custom temporary password', async () => {
      const createRequest = {
        username: 'newuser',
        email: 'newuser@example.com',
        role: UserRole.REGULAR,
        temporaryPassword: 'CustomPass123!'
      };

      const mockCreatedUser = {
        Username: 'newuser',
        Attributes: [
          { Name: 'email', Value: 'newuser@example.com' },
          { Name: 'custom:role', Value: 'regular' }
        ]
      };

      mockCognitoClient.send.mockResolvedValue({
        User: mockCreatedUser
      });

      await userService.createUser(createRequest);

      // Verify the command was called with the custom password
      const { AdminCreateUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
      expect(AdminCreateUserCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          TemporaryPassword: 'CustomPass123!'
        })
      );
    });

    it('should handle user creation errors', async () => {
      const createRequest = {
        username: 'newuser',
        email: 'newuser@example.com',
        role: UserRole.REGULAR
      };

      mockCognitoClient.send.mockRejectedValue(new Error('User already exists'));

      await expect(userService.createUser(createRequest)).rejects.toThrow(WikiError);
    });

    it('should handle missing user data in response', async () => {
      const createRequest = {
        username: 'newuser',
        email: 'newuser@example.com',
        role: UserRole.REGULAR
      };

      mockCognitoClient.send.mockResolvedValue({
        User: null
      });

      await expect(userService.createUser(createRequest)).rejects.toThrow(WikiError);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateRequest = {
        username: 'testuser',
        email: 'updated@example.com',
        role: UserRole.ADMIN
      };

      // Mock the update call
      mockCognitoClient.send.mockResolvedValueOnce({}); // Update response

      // Mock the get user details call
      mockCognitoClient.send.mockResolvedValueOnce({
        Username: 'testuser',
        UserAttributes: [
          { Name: 'email', Value: 'updated@example.com' },
          { Name: 'custom:role', Value: 'admin' }
        ]
      });

      const user = await userService.updateUser(updateRequest);

      expect(user).toEqual({
        id: 'testuser',
        username: 'testuser',
        email: 'updated@example.com',
        role: UserRole.ADMIN
      });
    });

    it('should update only email', async () => {
      const updateRequest = {
        username: 'testuser',
        email: 'newemail@example.com'
      };

      mockCognitoClient.send.mockResolvedValueOnce({}); // Update response
      mockCognitoClient.send.mockResolvedValueOnce({
        Username: 'testuser',
        UserAttributes: [
          { Name: 'email', Value: 'newemail@example.com' },
          { Name: 'custom:role', Value: 'regular' }
        ]
      });

      const user = await userService.updateUser(updateRequest);
      expect(user.email).toBe('newemail@example.com');
    });

    it('should handle update errors', async () => {
      const updateRequest = {
        username: 'testuser',
        email: 'updated@example.com'
      };

      mockCognitoClient.send.mockRejectedValue(new Error('Update failed'));

      await expect(userService.updateUser(updateRequest)).rejects.toThrow(WikiError);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockCognitoClient.send.mockResolvedValue({});

      await userService.deleteUser('testuser');

      const { AdminDeleteUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
      expect(AdminDeleteUserCommand).toHaveBeenCalledWith({
        UserPoolId: 'test-pool-id',
        Username: 'testuser'
      });
    });

    it('should handle delete errors', async () => {
      mockCognitoClient.send.mockRejectedValue(new Error('Delete failed'));

      await expect(userService.deleteUser('testuser')).rejects.toThrow(WikiError);
    });
  });

  describe('getUserDetails', () => {
    it('should get user details successfully', async () => {
      mockCognitoClient.send.mockResolvedValue({
        Username: 'testuser',
        UserAttributes: [
          { Name: 'email', Value: 'test@example.com' },
          { Name: 'custom:role', Value: 'admin' }
        ]
      });

      const user = await userService.getUserDetails('testuser');

      expect(user).toEqual({
        id: 'testuser',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.ADMIN
      });
    });

    it('should handle missing user', async () => {
      mockCognitoClient.send.mockResolvedValue({
        Username: null
      });

      await expect(userService.getUserDetails('nonexistent')).rejects.toThrow(WikiError);
    });

    it('should handle get user errors', async () => {
      mockCognitoClient.send.mockRejectedValue(new Error('User not found'));

      await expect(userService.getUserDetails('testuser')).rejects.toThrow(WikiError);
    });

    it('should handle users with missing attributes', async () => {
      mockCognitoClient.send.mockResolvedValue({
        Username: 'testuser',
        UserAttributes: [] // No attributes
      });

      const user = await userService.getUserDetails('testuser');

      expect(user).toEqual({
        id: 'testuser',
        username: 'testuser',
        email: '',
        role: UserRole.REGULAR // Default role
      });
    });

    it('should handle invalid role values', async () => {
      mockCognitoClient.send.mockResolvedValue({
        Username: 'testuser',
        UserAttributes: [
          { Name: 'email', Value: 'test@example.com' },
          { Name: 'custom:role', Value: 'invalid-role' }
        ]
      });

      const user = await userService.getUserDetails('testuser');
      expect(user.role).toBe(UserRole.REGULAR); // Should default to regular
    });
  });

  describe('role mapping', () => {
    it('should map role strings correctly', async () => {
      const testCases = [
        { roleString: 'admin', expected: UserRole.ADMIN },
        { roleString: 'ADMIN', expected: UserRole.ADMIN },
        { roleString: 'regular', expected: UserRole.REGULAR },
        { roleString: 'REGULAR', expected: UserRole.REGULAR },
        { roleString: 'guest', expected: UserRole.GUEST },
        { roleString: 'GUEST', expected: UserRole.GUEST },
        { roleString: 'unknown', expected: UserRole.REGULAR },
        { roleString: '', expected: UserRole.REGULAR }
      ];

      for (const testCase of testCases) {
        mockCognitoClient.send.mockResolvedValue({
          Username: 'testuser',
          UserAttributes: [
            { Name: 'email', Value: 'test@example.com' },
            { Name: 'custom:role', Value: testCase.roleString }
          ]
        });

        const user = await userService.getUserDetails('testuser');
        expect(user.role).toBe(testCase.expected);
      }
    });
  });

  describe('generateTemporaryPassword', () => {
    it('should generate password with required characteristics', () => {
      // Access the private method for testing
      const password = (userService as any).generateTemporaryPassword();

      expect(password).toHaveLength(12);
      expect(password).toMatch(/[A-Z]/); // Has uppercase
      expect(password).toMatch(/[a-z]/); // Has lowercase
      expect(password).toMatch(/[0-9]/); // Has number
      expect(password).toMatch(/[!@#$%^&*]/); // Has special character
    });

    it('should generate different passwords', () => {
      const password1 = (userService as any).generateTemporaryPassword();
      const password2 = (userService as any).generateTemporaryPassword();

      expect(password1).not.toBe(password2);
    });
  });
});
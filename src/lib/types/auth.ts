/**
 * Authentication related types
 */

export interface User {
  id: string;
  username: string;
  role: UserRole;
  email: string;
}

export enum UserRole {
  GUEST = 'guest',
  REGULAR = 'regular',
  ADMIN = 'admin'
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface AuthService {
  login(username: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  refreshToken(): Promise<string>;
  checkPermission(action: string): boolean;
}
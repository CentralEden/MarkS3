/**
 * AWS Error Handling Utilities
 * Centralized error handling and retry logic for AWS SDK operations
 */

import { WikiError, ErrorCodes } from '../types/errors.js';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterMax: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterMax: 1000
};

/**
 * AWS service types for context-specific error handling
 */
export enum AWSService {
  S3 = 'S3',
  COGNITO = 'Cognito',
  COGNITO_IDENTITY = 'CognitoIdentity'
}

/**
 * Execute AWS operation with exponential backoff retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  service: AWSService,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error, service)) {
        throw createUserFriendlyError(error, service);
      }
      
      // Don't retry on the last attempt
      if (attempt === retryConfig.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
        retryConfig.maxDelay
      );
      const jitter = Math.random() * retryConfig.jitterMax;
      const delay = exponentialDelay + jitter;
      
      console.warn(
        `${service} operation failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), ` +
        `retrying in ${Math.round(delay)}ms:`, 
        error.message
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw createUserFriendlyError(lastError, service);
}

/**
 * Check if an error should not be retried based on service and error type
 */
export function isNonRetryableError(error: any, service: AWSService): boolean {
  const errorName = error.name || error.code || '';
  
  // Common non-retryable errors across all AWS services
  const commonNonRetryableErrors = [
    'AccessDenied',
    'InvalidAccessKeyId',
    'SignatureDoesNotMatch',
    'TokenRefreshRequired',
    'InvalidRequest',
    'InvalidParameterException',
    'MalformedPolicy',
    'RequestTimeTooSkewed',
    // Browser-specific errors
    'CORSError',
    'AbortError'
  ];
  
  // Service-specific non-retryable errors
  const serviceSpecificErrors: Record<AWSService, string[]> = {
    [AWSService.S3]: [
      'NoSuchBucket',
      'NoSuchKey',
      'NotFound',
      'PreconditionFailed',
      'EntityTooLarge',
      'InvalidBucketName',
      'BucketAlreadyExists',
      'BucketNotEmpty',
      'InvalidStorageClass',
      'InvalidArgument',
      'MalformedXML'
    ],
    [AWSService.COGNITO]: [
      'NotAuthorizedException',
      'UserNotConfirmedException',
      'UserNotFoundException',
      'InvalidPasswordException',
      'CodeMismatchException',
      'ExpiredCodeException',
      'AliasExistsException',
      'UsernameExistsException',
      'InvalidUserPoolConfigurationException',
      'ResourceNotFoundException',
      'TooManyRequestsException'
    ],
    [AWSService.COGNITO_IDENTITY]: [
      'NotAuthorizedException',
      'ResourceNotFoundException',
      'InvalidParameterException',
      'ResourceConflictException'
    ]
  };
  
  const nonRetryableErrors = [
    ...commonNonRetryableErrors,
    ...(serviceSpecificErrors[service] || [])
  ];
  
  // Check for CORS-related errors in the message
  if (error.message && (
    error.message.includes('CORS') ||
    error.message.includes('Cross-Origin') ||
    error.message.includes('blocked by CORS policy')
  )) {
    return true;
  }
  
  return nonRetryableErrors.includes(errorName);
}

/**
 * Create user-friendly error messages based on AWS service and error type
 */
export function createUserFriendlyError(error: any, service: AWSService): WikiError {
  const errorName = error.name || error.code || '';
  const errorMessage = error.message || '';
  
  console.error(`${service} Error:`, error);
  
  // Authentication and authorization errors
  if (errorName === 'AccessDenied') {
    return new WikiError(
      ErrorCodes.S3_ACCESS_DENIED,
      `Access denied to ${service} service. Please check your AWS credentials and permissions. ` +
      'Ensure your Cognito identity pool has the necessary permissions.',
      error
    );
  }
  
  if (errorName === 'InvalidAccessKeyId' || errorName === 'SignatureDoesNotMatch') {
    return new WikiError(
      ErrorCodes.AUTH_FAILED,
      'Invalid AWS credentials. Please check your Cognito configuration and try logging in again.',
      error
    );
  }
  
  // Service-specific error handling
  switch (service) {
    case AWSService.S3:
      return createS3UserFriendlyError(error, errorName, errorMessage);
    case AWSService.COGNITO:
    case AWSService.COGNITO_IDENTITY:
      return createCognitoUserFriendlyError(error, errorName, errorMessage);
    default:
      return createGenericUserFriendlyError(error, errorName, errorMessage);
  }
}

/**
 * Create user-friendly error messages for S3 operations
 */
function createS3UserFriendlyError(error: any, errorName: string, errorMessage: string): WikiError {
  switch (errorName) {
    case 'NoSuchBucket':
      return new WikiError(
        ErrorCodes.BUCKET_NOT_FOUND,
        'S3 bucket not found. Please check your bucket name and region configuration.',
        error
      );
    
    case 'NoSuchKey':
    case 'NotFound':
      return new WikiError(
        ErrorCodes.BUCKET_NOT_FOUND,
        'The requested file or page was not found.',
        error
      );
    
    case 'PreconditionFailed':
      return new WikiError(
        ErrorCodes.EDIT_CONFLICT,
        'The file has been modified by another user. Please refresh and try again.',
        error
      );
    
    case 'EntityTooLarge':
      return new WikiError(
        ErrorCodes.FILE_TOO_LARGE,
        'File is too large. Please reduce the file size and try again.',
        error
      );
    
    case 'NetworkingError':
    case 'TimeoutError':
    case 'NetworkError':
      return new WikiError(
        ErrorCodes.NETWORK_ERROR,
        'Network error occurred while accessing storage. Please check your internet connection and try again.',
        error
      );
    
    case 'ServiceUnavailable':
    case 'SlowDown':
      return new WikiError(
        ErrorCodes.NETWORK_ERROR,
        'Storage service is temporarily unavailable. Please try again in a few moments.',
        error
      );
    
    default:
      if (errorMessage.includes('CORS') || errorMessage.includes('Cross-Origin')) {
        return new WikiError(
          ErrorCodes.NETWORK_ERROR,
          'Cross-origin request blocked. Please ensure your S3 bucket has proper CORS configuration.',
          error
        );
      }
      
      if (errorMessage.includes('fetch')) {
        return new WikiError(
          ErrorCodes.NETWORK_ERROR,
          'Network request failed. Please check your internet connection and try again.',
          error
        );
      }
      
      return new WikiError(
        ErrorCodes.NETWORK_ERROR,
        'An error occurred while accessing storage. Please try again.',
        error
      );
  }
}

/**
 * Create user-friendly error messages for Cognito operations
 */
function createCognitoUserFriendlyError(error: any, errorName: string, errorMessage: string): WikiError {
  switch (errorName) {
    case 'NotAuthorizedException':
      return new WikiError(
        ErrorCodes.AUTH_FAILED,
        'Invalid username or password. Please check your credentials and try again.',
        error
      );
    
    case 'UserNotConfirmedException':
      return new WikiError(
        ErrorCodes.AUTH_FAILED,
        'Your account has not been confirmed. Please check your email for a confirmation link.',
        error
      );
    
    case 'UserNotFoundException':
      return new WikiError(
        ErrorCodes.AUTH_FAILED,
        'User not found. Please check your username or contact your administrator.',
        error
      );
    
    case 'InvalidPasswordException':
      return new WikiError(
        ErrorCodes.AUTH_FAILED,
        'Invalid password format. Please ensure your password meets the requirements.',
        error
      );
    
    case 'TooManyRequestsException':
      return new WikiError(
        ErrorCodes.AUTH_FAILED,
        'Too many login attempts. Please wait a few minutes before trying again.',
        error
      );
    
    case 'NetworkingError':
    case 'TimeoutError':
    case 'NetworkError':
      return new WikiError(
        ErrorCodes.NETWORK_ERROR,
        'Network error occurred during authentication. Please check your internet connection and try again.',
        error
      );
    
    case 'ServiceUnavailable':
      return new WikiError(
        ErrorCodes.NETWORK_ERROR,
        'Authentication service is temporarily unavailable. Please try again later.',
        error
      );
    
    default:
      if (errorMessage.includes('fetch')) {
        return new WikiError(
          ErrorCodes.NETWORK_ERROR,
          'Network error occurred during authentication. Please check your internet connection and try again.',
          error
        );
      }
      
      return new WikiError(
        ErrorCodes.AUTH_FAILED,
        'Authentication failed. Please check your credentials and try again.',
        error
      );
  }
}

/**
 * Create generic user-friendly error messages
 */
function createGenericUserFriendlyError(error: any, errorName: string, errorMessage: string): WikiError {
  if (errorName === 'NetworkingError' || errorName === 'TimeoutError' || errorName === 'NetworkError') {
    return new WikiError(
      ErrorCodes.NETWORK_ERROR,
      'Network error occurred. Please check your internet connection and try again.',
      error
    );
  }
  
  if (errorMessage.includes('fetch')) {
    return new WikiError(
      ErrorCodes.NETWORK_ERROR,
      'Network request failed. Please check your internet connection and try again.',
      error
    );
  }
  
  return new WikiError(
    ErrorCodes.NETWORK_ERROR,
    'An unexpected error occurred. Please try again.',
    error
  );
}

/**
 * Utility function to check if we're in a browser environment
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Utility function to check network connectivity (browser only)
 */
export function isOnline(): boolean {
  if (!isBrowserEnvironment()) {
    return true; // Assume online in non-browser environments
  }
  
  return navigator.onLine;
}

/**
 * Create a promise that rejects after a timeout
 */
export function createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Execute operation with timeout
 */
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    operation(),
    createTimeoutPromise<T>(timeoutMs)
  ]);
}
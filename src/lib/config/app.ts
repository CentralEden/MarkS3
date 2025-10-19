/**
 * Application configuration
 * Handles environment variables and AWS configuration
 */

import type { AWSConfig } from '../types/index.js';

// Default configuration values
const DEFAULT_CONFIG = {
  region: 'us-east-1',
  bucketName: 'marks3-wiki-bucket',
  cognitoUserPoolId: '',
  cognitoIdentityPoolId: '',
  cognitoClientId: ''
};

/**
 * Get AWS configuration from environment variables or defaults
 */
export function getAWSConfig(): AWSConfig {
  // In a real implementation, these would come from environment variables
  // For now, using defaults that will be configured during deployment
  return {
    region: import.meta.env.VITE_AWS_REGION || DEFAULT_CONFIG.region,
    bucketName: import.meta.env.VITE_S3_BUCKET_NAME || DEFAULT_CONFIG.bucketName,
    cognitoUserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || DEFAULT_CONFIG.cognitoUserPoolId,
    cognitoIdentityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || DEFAULT_CONFIG.cognitoIdentityPoolId,
    cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || DEFAULT_CONFIG.cognitoClientId
  };
}

/**
 * Validate AWS configuration
 */
export function validateAWSConfig(config: AWSConfig): boolean {
  return !!(
    config.region &&
    config.bucketName &&
    config.cognitoUserPoolId &&
    config.cognitoIdentityPoolId &&
    config.cognitoClientId
  );
}

/**
 * Application constants
 */
export const APP_CONFIG = {
  name: 'MarkS3',
  version: '0.1.0',
  description: 'A serverless markdown wiki system hosted on AWS S3',
  
  // File upload limits
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'],
  
  // S3 paths
  s3Paths: {
    pages: 'pages/',
    files: 'files/',
    metadata: 'metadata/',
    config: 'config/'
  },
  
  // Default wiki configuration
  defaultWikiConfig: {
    title: 'MarkS3 Wiki',
    description: 'A serverless markdown wiki system',
    allowGuestAccess: true,
    theme: 'default',
    features: {
      fileUpload: true,
      userManagement: true
    }
  }
};
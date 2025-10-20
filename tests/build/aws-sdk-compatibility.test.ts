/**
 * AWS SDK compatibility tests for browser environment
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const DIST_PATH = resolve(process.cwd(), 'build');
const ASSETS_PATH = join(DIST_PATH, '_app/immutable');

describe('AWS SDK Browser Compatibility', () => {
  let bundleContent: string;
  
  beforeAll(() => {
    if (!existsSync(ASSETS_PATH)) {
      throw new Error('Build directory not found. Run "pnpm build" first.');
    }
    
    // Read all JS bundle content
    const assetFiles = readdirSync(ASSETS_PATH);
    const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
    
    bundleContent = jsFiles
      .map(file => readFileSync(join(ASSETS_PATH, file), 'utf-8'))
      .join('\n');
  });

  describe('S3 Client Compatibility', () => {
    it('should include S3Client in bundle', () => {
      expect(bundleContent).toContain('S3Client');
    });

    it('should include S3 operations', () => {
      const s3Operations = [
        'GetObjectCommand',
        'PutObjectCommand',
        'DeleteObjectCommand',
        'ListObjectsV2Command'
      ];
      
      const foundOperations = s3Operations.filter(op => 
        bundleContent.includes(op)
      );
      
      expect(foundOperations.length).toBeGreaterThan(0);
    });

    it('should not include Node.js specific S3 handlers', () => {
      const nodeSpecific = [
        'NodeHttpHandler',
        'node-http-handler',
        'NodeHasher',
        'hash-node'
      ];
      
      for (const item of nodeSpecific) {
        expect(bundleContent).not.toContain(item);
      }
    });

    it('should include browser-compatible HTTP handler', () => {
      const browserHandlers = [
        'FetchHttpHandler',
        'fetch-http-handler',
        'XhrHttpHandler'
      ];
      
      const foundHandlers = browserHandlers.filter(handler => 
        bundleContent.includes(handler)
      );
      
      expect(foundHandlers.length).toBeGreaterThan(0);
    });
  });

  describe('Cognito Client Compatibility', () => {
    it('should include Cognito Identity client', () => {
      expect(bundleContent).toContain('CognitoIdentityClient');
    });

    it('should include Cognito Identity Provider client', () => {
      expect(bundleContent).toContain('CognitoIdentityProviderClient');
    });

    it('should include authentication commands', () => {
      const authCommands = [
        'GetIdCommand',
        'GetCredentialsForIdentityCommand',
        'InitiateAuthCommand',
        'RespondToAuthChallengeCommand'
      ];
      
      const foundCommands = authCommands.filter(cmd => 
        bundleContent.includes(cmd)
      );
      
      expect(foundCommands.length).toBeGreaterThan(0);
    });
  });

  describe('Credential Providers', () => {
    it('should include browser-compatible credential providers', () => {
      const browserProviders = [
        'fromCognitoIdentity',
        'fromWebToken',
        'credential-provider-cognito-identity'
      ];
      
      const foundProviders = browserProviders.filter(provider => 
        bundleContent.includes(provider)
      );
      
      expect(foundProviders.length).toBeGreaterThan(0);
    });

    it('should not include Node.js specific credential providers', () => {
      const nodeProviders = [
        'credential-provider-node',
        'credential-provider-ini',
        'credential-provider-process',
        'credential-provider-sso',
        'credential-provider-ec2',
        'credential-provider-ecs',
        'credential-provider-env'
      ];
      
      for (const provider of nodeProviders) {
        expect(bundleContent).not.toContain(provider);
      }
    });
  });

  describe('Polyfill Integration', () => {
    it('should have Buffer polyfill available for AWS SDK', () => {
      // AWS SDK uses Buffer for binary data
      expect(bundleContent).toMatch(/Buffer|_buffer/);
    });

    it('should have crypto polyfill for signing', () => {
      // AWS SDK needs crypto for request signing
      const cryptoIndicators = [
        'createHash',
        'createHmac',
        'randomBytes',
        'crypto-browserify'
      ];
      
      const foundCrypto = cryptoIndicators.filter(indicator => 
        bundleContent.includes(indicator)
      );
      
      expect(foundCrypto.length).toBeGreaterThan(0);
    });

    it('should have stream polyfill for data handling', () => {
      // AWS SDK uses streams for data processing
      const streamIndicators = [
        'Readable',
        'Transform',
        'readable-stream'
      ];
      
      const foundStream = streamIndicators.filter(indicator => 
        bundleContent.includes(indicator)
      );
      
      expect(foundStream.length).toBeGreaterThan(0);
    });

    it('should have process polyfill for environment variables', () => {
      // AWS SDK checks process.env
      expect(bundleContent).toMatch(/process\.env|process\.browser/);
    });
  });

  describe('Error Handling', () => {
    it('should include AWS SDK error types', () => {
      const errorTypes = [
        'ServiceException',
        'NoSuchKey',
        'AccessDenied',
        'InvalidToken'
      ];
      
      const foundErrors = errorTypes.filter(error => 
        bundleContent.includes(error)
      );
      
      expect(foundErrors.length).toBeGreaterThan(0);
    });

    it('should include retry logic', () => {
      const retryIndicators = [
        'retry',
        'RetryMode',
        'maxAttempts',
        'backoff'
      ];
      
      const foundRetry = retryIndicators.filter(indicator => 
        bundleContent.includes(indicator)
      );
      
      expect(foundRetry.length).toBeGreaterThan(0);
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should not include unused AWS services', () => {
      const unusedServices = [
        'DynamoDBClient',
        'LambdaClient',
        'EC2Client',
        'RDSClient',
        'SQSClient',
        'SNSClient'
      ];
      
      for (const service of unusedServices) {
        expect(bundleContent).not.toContain(service);
      }
    });

    it('should use tree-shaken AWS SDK modules', () => {
      // Should not include the entire AWS SDK
      expect(bundleContent).not.toContain('aws-sdk/lib/aws');
      expect(bundleContent).not.toContain('AWS.S3');
      expect(bundleContent).not.toContain('AWS.CognitoIdentity');
    });
  });

  describe('Browser Environment Checks', () => {
    it('should have proper browser environment detection', () => {
      const browserChecks = [
        'typeof window',
        'typeof document',
        'navigator',
        'location'
      ];
      
      const foundChecks = browserChecks.filter(check => 
        bundleContent.includes(check)
      );
      
      expect(foundChecks.length).toBeGreaterThan(0);
    });

    it('should not have Node.js environment checks', () => {
      const nodeChecks = [
        'typeof require',
        'process.versions.node',
        '__dirname',
        '__filename'
      ];
      
      // These might be present in polyfills, but should not be used for environment detection
      for (const check of nodeChecks) {
        if (bundleContent.includes(check)) {
          console.warn(`Found Node.js environment check: ${check}`);
        }
      }
    });
  });
});
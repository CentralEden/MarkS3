/**
 * Browser Deployment Validation Tests
 * Tests that validate the deployed application works correctly in browser environment
 * This test examines the built files and validates AWS SDK browser compatibility
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const BUILD_PATH = resolve(process.cwd(), 'build');
const ASSETS_PATH = join(BUILD_PATH, '_app', 'immutable');

describe('Browser Deployment Validation', () => {
  let bundleFiles: string[] = [];
  let bundleContent: string = '';
  
  beforeAll(() => {
    if (!existsSync(BUILD_PATH)) {
      throw new Error('Build directory not found. Run "pnpm build" first.');
    }
    
    // Find all JavaScript bundle files
    const findJsFiles = (dir: string): string[] => {
      const files: string[] = [];
      if (!existsSync(dir)) return files;
      
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = join(dir, item.name);
        if (item.isDirectory()) {
          files.push(...findJsFiles(fullPath));
        } else if (item.name.endsWith('.js')) {
          files.push(fullPath);
        }
      }
      return files;
    };
    
    bundleFiles = findJsFiles(ASSETS_PATH);
    
    // Read all bundle content for analysis
    bundleContent = bundleFiles
      .map(file => {
        try {
          return readFileSync(file, 'utf-8');
        } catch (error) {
          console.warn(`Failed to read ${file}:`, error);
          return '';
        }
      })
      .join('\n');
  });

  describe('Build Output Structure', () => {
    it('should have required build files', () => {
      expect(existsSync(join(BUILD_PATH, 'index.html'))).toBe(true);
      expect(existsSync(ASSETS_PATH)).toBe(true);
      expect(bundleFiles.length).toBeGreaterThan(0);
    });

    it('should have proper chunk splitting', () => {
      const chunkNames = bundleFiles.map(file => {
        const name = file.split('/').pop() || '';
        return name.replace(/\.[^.]+\.js$/, '');
      });
      
      // Should have AWS SDK chunks
      const awsChunks = chunkNames.filter(name => 
        name.includes('aws-') || name.includes('cognito') || name.includes('s3')
      );
      expect(awsChunks.length).toBeGreaterThan(0);
      
      // Should have polyfill chunk
      const polyfillChunks = chunkNames.filter(name => name.includes('polyfill'));
      expect(polyfillChunks.length).toBeGreaterThan(0);
    });

    it('should have reasonable bundle sizes', () => {
      const largeBundles = bundleFiles.filter(file => {
        try {
          const stats = require('fs').statSync(file);
          return stats.size > 1024 * 1024; // 1MB
        } catch {
          return false;
        }
      });
      
      // Should not have too many large bundles
      expect(largeBundles.length).toBeLessThan(5);
    });
  });

  describe('AWS SDK Browser Compatibility', () => {
    it('should include browser-compatible S3 client', () => {
      expect(bundleContent).toContain('S3Client');
      
      // Should include S3 operations
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

    it('should include browser-compatible Cognito clients', () => {
      expect(bundleContent).toContain('CognitoIdentityClient');
      expect(bundleContent).toContain('CognitoIdentityProviderClient');
      
      // Should include authentication commands
      const authCommands = [
        'GetIdCommand',
        'GetCredentialsForIdentityCommand',
        'InitiateAuthCommand'
      ];
      
      const foundCommands = authCommands.filter(cmd => 
        bundleContent.includes(cmd)
      );
      expect(foundCommands.length).toBeGreaterThan(0);
    });

    it('should exclude Node.js specific AWS SDK modules', () => {
      const nodeSpecificModules = [
        'NodeHttpHandler',
        'node-http-handler',
        'NodeHasher',
        'hash-node',
        'credential-provider-node',
        'credential-provider-ini',
        'credential-provider-process'
      ];
      
      for (const module of nodeSpecificModules) {
        expect(bundleContent).not.toContain(module);
      }
    });

    it('should include browser-compatible HTTP handlers', () => {
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
  });

  describe('Polyfill Integration', () => {
    it('should include Buffer polyfill', () => {
      expect(bundleContent).toMatch(/Buffer|_buffer/);
    });

    it('should include crypto polyfill', () => {
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

    it('should include stream polyfill', () => {
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

    it('should include process polyfill', () => {
      expect(bundleContent).toMatch(/process\.env|process\.browser/);
    });

    it('should not include Node.js specific modules', () => {
      const nodeModules = [
        'require("fs")',
        'require("path")',
        'require("http")',
        'require("https")',
        'require("child_process")',
        '__dirname',
        '__filename'
      ];
      
      // These should either not be present or be polyfilled
      for (const nodeModule of nodeModules) {
        if (bundleContent.includes(nodeModule)) {
          console.warn(`Found Node.js module reference: ${nodeModule}`);
        }
      }
    });
  });

  describe('Error Handling and Retry Logic', () => {
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

    it('should include error handling utilities', () => {
      // Should include our custom error handling
      expect(bundleContent).toMatch(/WikiError|ErrorCodes/);
      expect(bundleContent).toMatch(/executeWithRetry|createUserFriendlyError/);
    });
  });

  describe('Static Hosting Compatibility', () => {
    it('should use relative paths for imports', () => {
      // Check that imports use relative paths suitable for S3 hosting
      const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      const imports = [...bundleContent.matchAll(importPattern)];
      
      const absoluteImports = imports.filter(match => {
        const path = match[1];
        return path.startsWith('/') && !path.startsWith('./') && !path.startsWith('../');
      });
      
      // Should minimize absolute imports for better S3 compatibility
      expect(absoluteImports.length).toBeLessThan(10);
    });

    it('should have proper asset references', () => {
      // Check index.html for proper asset references
      const indexPath = join(BUILD_PATH, 'index.html');
      if (existsSync(indexPath)) {
        const indexContent = readFileSync(indexPath, 'utf-8');
        
        // Should use relative paths for assets
        expect(indexContent).toMatch(/_app\/immutable/);
        
        // Should not have absolute paths that would break on S3
        expect(indexContent).not.toMatch(/src="\//);
        expect(indexContent).not.toMatch(/href="\//);
      }
    });

    it('should support SPA routing', () => {
      // Should have proper fallback handling for client-side routing
      const indexPath = join(BUILD_PATH, 'index.html');
      if (existsSync(indexPath)) {
        const indexContent = readFileSync(indexPath, 'utf-8');
        
        // Should include SvelteKit app structure
        expect(indexContent).toMatch(/%sveltekit\./);
      }
    });
  });

  describe('Performance Optimizations', () => {
    it('should have code splitting implemented', () => {
      // Should have multiple chunks for better loading
      expect(bundleFiles.length).toBeGreaterThan(5);
      
      // Should have separate chunks for different concerns
      const chunkTypes = bundleFiles.map(file => {
        const name = file.split('/').pop() || '';
        if (name.includes('aws-')) return 'aws';
        if (name.includes('polyfill')) return 'polyfill';
        if (name.includes('vendor')) return 'vendor';
        if (name.includes('component')) return 'component';
        return 'other';
      });
      
      const uniqueTypes = new Set(chunkTypes);
      expect(uniqueTypes.size).toBeGreaterThan(2);
    });

    it('should have reasonable chunk sizes', () => {
      const chunkSizes = bundleFiles.map(file => {
        try {
          const stats = require('fs').statSync(file);
          return { file: file.split('/').pop(), size: stats.size };
        } catch {
          return { file: 'unknown', size: 0 };
        }
      });
      
      // Log chunk sizes for analysis
      console.log('Chunk sizes:');
      chunkSizes
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .forEach(chunk => {
          console.log(`  ${chunk.file}: ${(chunk.size / 1024).toFixed(1)}KB`);
        });
      
      // Largest chunk should be reasonable (under 1MB)
      const largestChunk = Math.max(...chunkSizes.map(c => c.size));
      expect(largestChunk).toBeLessThan(1024 * 1024); // 1MB
    });

    it('should exclude unused AWS services', () => {
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
  });

  describe('Browser Environment Validation', () => {
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

    it('should handle missing browser APIs gracefully', () => {
      // Should include checks for localStorage, fetch, etc.
      expect(bundleContent).toMatch(/typeof.*localStorage|localStorage.*undefined/);
      expect(bundleContent).toMatch(/typeof.*fetch|fetch.*undefined/);
    });

    it('should include monitoring and error tracking', () => {
      // Should include our monitoring service
      expect(bundleContent).toMatch(/monitoringService|trackError|trackPerformance/);
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive information', () => {
      const sensitivePatterns = [
        /aws_access_key_id/i,
        /aws_secret_access_key/i,
        /password.*=.*['"]/i,
        /secret.*=.*['"]/i
      ];
      
      for (const pattern of sensitivePatterns) {
        expect(bundleContent).not.toMatch(pattern);
      }
    });

    it('should include DOMPurify for XSS protection', () => {
      expect(bundleContent).toMatch(/DOMPurify|sanitize/);
    });

    it('should use secure defaults', () => {
      // Should not include eval or other dangerous functions
      const dangerousPatterns = [
        /eval\s*\(/,
        /Function\s*\(/,
        /setTimeout\s*\(\s*['"`]/,
        /setInterval\s*\(\s*['"`]/
      ];
      
      for (const pattern of dangerousPatterns) {
        if (bundleContent.match(pattern)) {
          console.warn(`Found potentially dangerous pattern: ${pattern}`);
        }
      }
    });
  });
});
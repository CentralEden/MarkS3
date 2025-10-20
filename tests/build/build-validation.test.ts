/**
 * Build validation tests to ensure proper bundling and polyfill inclusion
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const DIST_PATH = resolve(process.cwd(), 'build');
const ASSETS_PATH = join(DIST_PATH, '_app/immutable');

describe('Build Validation', () => {
  beforeAll(() => {
    // Ensure build exists
    if (!existsSync(DIST_PATH)) {
      throw new Error('Build directory not found. Run "pnpm build" first.');
    }
  });

  describe('Bundle Structure', () => {
    it('should generate required build artifacts', () => {
      expect(existsSync(DIST_PATH)).toBe(true);
      expect(existsSync(ASSETS_PATH)).toBe(true);
      expect(existsSync(join(DIST_PATH, 'index.html'))).toBe(true);
    });

    it('should generate proper chunk files', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      expect(jsFiles.length).toBeGreaterThan(0);
      
      // Check for expected chunks
      const chunkNames = jsFiles.map(file => {
        // Extract chunk name from filename pattern
        const match = file.match(/^([^-]+)/);
        return match ? match[1] : file;
      });
      
      // Should have main application chunk
      expect(chunkNames.some(name => 
        name.includes('app') || name.includes('index') || name.includes('main')
      )).toBe(true);
    });

    it('should have reasonable chunk sizes', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const stats = statSync(filePath);
        const sizeKB = stats.size / 1024;
        
        // No single chunk should be larger than 1MB
        expect(sizeKB).toBeLessThan(1024);
        
        // Warn if chunks are getting large
        if (sizeKB > 500) {
          console.warn(`Large chunk detected: ${file} (${Math.round(sizeKB)}KB)`);
        }
      }
    });
  });

  describe('Polyfill Inclusion', () => {
    it('should include buffer polyfill in bundle', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      let bufferFound = false;
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Check for buffer polyfill indicators
        if (content.includes('Buffer') || 
            content.includes('buffer') ||
            content.includes('_buffer')) {
          bufferFound = true;
          break;
        }
      }
      
      expect(bufferFound).toBe(true);
    });

    it('should include crypto polyfill in bundle', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      let cryptoFound = false;
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Check for crypto polyfill indicators
        if (content.includes('crypto-browserify') || 
            content.includes('createHash') ||
            content.includes('randomBytes')) {
          cryptoFound = true;
          break;
        }
      }
      
      expect(cryptoFound).toBe(true);
    });

    it('should include stream polyfill in bundle', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      let streamFound = false;
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Check for stream polyfill indicators
        if (content.includes('readable-stream') || 
            content.includes('Readable') ||
            content.includes('Transform')) {
          streamFound = true;
          break;
        }
      }
      
      expect(streamFound).toBe(true);
    });

    it('should include process polyfill in bundle', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      let processFound = false;
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Check for process polyfill indicators
        if (content.includes('process.env') || 
            content.includes('process.browser') ||
            content.includes('process.version')) {
          processFound = true;
          break;
        }
      }
      
      expect(processFound).toBe(true);
    });
  });

  describe('AWS SDK Bundle Compatibility', () => {
    it('should include AWS SDK client modules', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      let awsS3Found = false;
      let awsCognitoFound = false;
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Check for AWS SDK modules
        if (content.includes('S3Client') || 
            content.includes('@aws-sdk/client-s3')) {
          awsS3Found = true;
        }
        
        if (content.includes('CognitoIdentity') || 
            content.includes('@aws-sdk/client-cognito')) {
          awsCognitoFound = true;
        }
      }
      
      expect(awsS3Found).toBe(true);
      expect(awsCognitoFound).toBe(true);
    });

    it('should not include Node.js specific AWS SDK modules', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Check that Node.js specific modules are not included
        expect(content).not.toContain('node-http-handler');
        expect(content).not.toContain('hash-node');
        expect(content).not.toContain('credential-provider-node');
        expect(content).not.toContain('credential-provider-ini');
      }
    });

    it('should use browser-compatible AWS SDK imports', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      let browserCompatibleFound = false;
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Check for browser-compatible patterns
        if (content.includes('fetch-http-handler') || 
            content.includes('credential-provider-cognito-identity') ||
            content.includes('hash-browser')) {
          browserCompatibleFound = true;
          break;
        }
      }
      
      expect(browserCompatibleFound).toBe(true);
    });
  });

  describe('Static Asset Generation', () => {
    it('should generate proper HTML with module imports', () => {
      const indexPath = join(DIST_PATH, 'index.html');
      const content = readFileSync(indexPath, 'utf-8');
      
      // Should have proper module script tags
      expect(content).toContain('type="module"');
      
      // Should reference generated assets
      expect(content).toMatch(/assets\/.*\.js/);
    });

    it('should generate proper asset paths for static hosting', () => {
      const indexPath = join(DIST_PATH, 'index.html');
      const content = readFileSync(indexPath, 'utf-8');
      
      // Should use relative paths (not absolute)
      expect(content).not.toContain('href="/"');
      expect(content).not.toContain('src="/"');
      
      // Should use proper asset directory
      expect(content).toContain('assets/');
    });

    it('should include proper meta tags for static hosting', () => {
      const indexPath = join(DIST_PATH, 'index.html');
      const content = readFileSync(indexPath, 'utf-8');
      
      // Should have viewport meta tag
      expect(content).toContain('name="viewport"');
      
      // Should have charset
      expect(content).toContain('charset="utf-8"');
    });

    it('should generate CSS files with proper paths', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const cssFiles = assetFiles.filter(file => file.endsWith('.css'));
      
      expect(cssFiles.length).toBeGreaterThan(0);
      
      // Check CSS content for proper asset references
      for (const file of cssFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Should not contain absolute paths
        expect(content).not.toMatch(/url\(["']?\//);
      }
    });
  });

  describe('Code Splitting Validation', () => {
    it('should generate separate chunks for major dependencies', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      // Should have multiple JS files (indicating code splitting)
      expect(jsFiles.length).toBeGreaterThan(1);
      
      // Check for expected chunk patterns
      const hasAwsChunk = jsFiles.some(file => 
        file.includes('aws') || file.includes('s3') || file.includes('cognito')
      );
      const hasPolyfillChunk = jsFiles.some(file => 
        file.includes('polyfill') || file.includes('vendor')
      );
      
      expect(hasAwsChunk || hasPolyfillChunk).toBe(true);
    });

    it('should have reasonable total bundle size', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      let totalSize = 0;
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const stats = statSync(filePath);
        totalSize += stats.size;
      }
      
      const totalSizeKB = totalSize / 1024;
      
      // Total bundle should be reasonable (less than 3MB)
      expect(totalSizeKB).toBeLessThan(3072);
      
      console.log(`Total bundle size: ${Math.round(totalSizeKB)}KB`);
    });
  });

  describe('Module Format Validation', () => {
    it('should generate ES modules format', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Should use ES module syntax
        const hasImport = content.includes('import') || content.includes('export');
        const hasRequire = content.includes('require(') && !content.includes('__require');
        
        // ES modules should be preferred over CommonJS
        if (hasRequire && !hasImport) {
          console.warn(`File ${file} appears to use CommonJS instead of ES modules`);
        }
      }
    });

    it('should not leak global variables', () => {
      const assetFiles = readdirSync(ASSETS_PATH);
      const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
      
      for (const file of jsFiles) {
        const filePath = join(ASSETS_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Should not have obvious global variable leaks
        expect(content).not.toMatch(/window\.\w+\s*=/);
        expect(content).not.toMatch(/global\.\w+\s*=/);
      }
    });
  });
});
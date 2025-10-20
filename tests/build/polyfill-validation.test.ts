/**
 * Polyfill validation tests to ensure proper browser compatibility
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const DIST_PATH = resolve(process.cwd(), 'build');
const ASSETS_PATH = join(DIST_PATH, '_app/immutable');

describe('Polyfill Validation', () => {
  let bundleContent: string;
  let polyfillChunks: string[] = [];
  
  beforeAll(() => {
    if (!existsSync(ASSETS_PATH)) {
      throw new Error('Build directory not found. Run "pnpm build" first.');
    }
    
    // Read all JS bundle content and identify polyfill chunks
    const assetFiles = readdirSync(ASSETS_PATH);
    const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
    
    bundleContent = '';
    
    for (const file of jsFiles) {
      const content = readFileSync(join(ASSETS_PATH, file), 'utf-8');
      bundleContent += content + '\n';
      
      // Identify polyfill chunks
      if (file.includes('polyfill') || 
          content.includes('buffer') || 
          content.includes('crypto-browserify') ||
          content.includes('readable-stream')) {
        polyfillChunks.push(file);
      }
    }
  });

  describe('Buffer Polyfill', () => {
    it('should include Buffer constructor', () => {
      expect(bundleContent).toMatch(/function Buffer|class Buffer|Buffer\s*=/);
    });

    it('should include Buffer methods', () => {
      const bufferMethods = [
        'Buffer.from',
        'Buffer.alloc',
        'Buffer.isBuffer',
        'toString',
        'slice'
      ];
      
      const foundMethods = bufferMethods.filter(method => 
        bundleContent.includes(method)
      );
      
      expect(foundMethods.length).toBeGreaterThan(2);
    });

    it('should handle binary data operations', () => {
      const binaryOps = [
        'readUInt8',
        'writeUInt8',
        'readUInt32BE',
        'writeUInt32BE'
      ];
      
      const foundOps = binaryOps.filter(op => 
        bundleContent.includes(op)
      );
      
      expect(foundOps.length).toBeGreaterThan(0);
    });
  });

  describe('Crypto Polyfill', () => {
    it('should include crypto-browserify', () => {
      expect(bundleContent).toMatch(/crypto-browserify|createHash|createHmac/);
    });

    it('should include hash functions', () => {
      const hashFunctions = [
        'createHash',
        'createHmac',
        'sha256',
        'md5'
      ];
      
      const foundFunctions = hashFunctions.filter(func => 
        bundleContent.includes(func)
      );
      
      expect(foundFunctions.length).toBeGreaterThan(1);
    });

    it('should include random number generation', () => {
      expect(bundleContent).toMatch(/randomBytes|getRandomValues/);
    });

    it('should not include Node.js crypto module', () => {
      expect(bundleContent).not.toContain('require("crypto")');
      expect(bundleContent).not.toContain('require(\'crypto\')');
    });
  });

  describe('Stream Polyfill', () => {
    it('should include readable-stream', () => {
      expect(bundleContent).toMatch(/readable-stream|Readable|Transform/);
    });

    it('should include stream classes', () => {
      const streamClasses = [
        'Readable',
        'Writable',
        'Transform',
        'PassThrough'
      ];
      
      const foundClasses = streamClasses.filter(cls => 
        bundleContent.includes(cls)
      );
      
      expect(foundClasses.length).toBeGreaterThan(1);
    });

    it('should include stream methods', () => {
      const streamMethods = [
        'pipe',
        'read',
        'write',
        'end'
      ];
      
      const foundMethods = streamMethods.filter(method => 
        bundleContent.includes(method)
      );
      
      expect(foundMethods.length).toBeGreaterThan(2);
    });
  });

  describe('Process Polyfill', () => {
    it('should include process object', () => {
      expect(bundleContent).toMatch(/process\s*=|process\.env|process\.browser/);
    });

    it('should include environment variables', () => {
      expect(bundleContent).toContain('process.env');
    });

    it('should include browser flag', () => {
      expect(bundleContent).toMatch(/process\.browser\s*=\s*true/);
    });

    it('should include version information', () => {
      expect(bundleContent).toMatch(/process\.version|process\.versions/);
    });
  });

  describe('Path Polyfill', () => {
    it('should include path-browserify', () => {
      expect(bundleContent).toMatch(/path-browserify|path\.join|path\.resolve/);
    });

    it('should include path methods', () => {
      const pathMethods = [
        'join',
        'resolve',
        'dirname',
        'basename',
        'extname'
      ];
      
      const foundMethods = pathMethods.filter(method => 
        bundleContent.includes(`path.${method}`) || 
        bundleContent.includes(`"${method}"`) ||
        bundleContent.includes(`'${method}'`)
      );
      
      expect(foundMethods.length).toBeGreaterThan(2);
    });
  });

  describe('OS Polyfill', () => {
    it('should include os-browserify', () => {
      expect(bundleContent).toMatch(/os-browserify|platform|arch/);
    });

    it('should provide platform information', () => {
      const osInfo = [
        'platform',
        'arch',
        'type',
        'endianness'
      ];
      
      const foundInfo = osInfo.filter(info => 
        bundleContent.includes(info)
      );
      
      expect(foundInfo.length).toBeGreaterThan(0);
    });
  });

  describe('URL Polyfill', () => {
    it('should include URL polyfill', () => {
      expect(bundleContent).toMatch(/URL|parse|format/);
    });

    it('should include URL parsing', () => {
      const urlFeatures = [
        'parse',
        'format',
        'resolve',
        'pathname',
        'search'
      ];
      
      const foundFeatures = urlFeatures.filter(feature => 
        bundleContent.includes(feature)
      );
      
      expect(foundFeatures.length).toBeGreaterThan(2);
    });
  });

  describe('Events Polyfill', () => {
    it('should include events polyfill', () => {
      expect(bundleContent).toMatch(/EventEmitter|events/);
    });

    it('should include event methods', () => {
      const eventMethods = [
        'on',
        'emit',
        'removeListener',
        'once'
      ];
      
      const foundMethods = eventMethods.filter(method => 
        bundleContent.includes(method)
      );
      
      expect(foundMethods.length).toBeGreaterThan(2);
    });
  });

  describe('Util Polyfill', () => {
    it('should include util polyfill', () => {
      expect(bundleContent).toMatch(/util|inherits|isArray/);
    });

    it('should include utility functions', () => {
      const utilFunctions = [
        'inherits',
        'isArray',
        'isBuffer',
        'inspect'
      ];
      
      const foundFunctions = utilFunctions.filter(func => 
        bundleContent.includes(func)
      );
      
      expect(foundFunctions.length).toBeGreaterThan(1);
    });
  });

  describe('Assert Polyfill', () => {
    it('should include assert polyfill', () => {
      expect(bundleContent).toMatch(/assert|AssertionError/);
    });

    it('should include assertion functions', () => {
      const assertFunctions = [
        'assert',
        'equal',
        'notEqual',
        'strictEqual'
      ];
      
      const foundFunctions = assertFunctions.filter(func => 
        bundleContent.includes(func)
      );
      
      expect(foundFunctions.length).toBeGreaterThan(0);
    });
  });

  describe('QueryString Polyfill', () => {
    it('should include querystring polyfill', () => {
      expect(bundleContent).toMatch(/querystring|stringify|parse/);
    });

    it('should include querystring methods', () => {
      const qsMethods = [
        'stringify',
        'parse',
        'escape',
        'unescape'
      ];
      
      const foundMethods = qsMethods.filter(method => 
        bundleContent.includes(method)
      );
      
      expect(foundMethods.length).toBeGreaterThan(1);
    });
  });

  describe('Global Polyfills', () => {
    it('should define global object', () => {
      expect(bundleContent).toMatch(/global\s*=|globalThis/);
    });

    it('should not leak polyfills to global scope', () => {
      // Polyfills should be properly scoped
      expect(bundleContent).not.toMatch(/window\.Buffer\s*=/);
      expect(bundleContent).not.toMatch(/window\.process\s*=/);
      expect(bundleContent).not.toMatch(/window\.crypto\s*=.*crypto-browserify/);
    });
  });

  describe('Polyfill Chunk Organization', () => {
    it('should have polyfill chunks', () => {
      expect(polyfillChunks.length).toBeGreaterThan(0);
    });

    it('should have reasonable polyfill chunk sizes', () => {
      for (const chunk of polyfillChunks) {
        const filePath = join(ASSETS_PATH, chunk);
        const content = readFileSync(filePath, 'utf-8');
        const sizeKB = Buffer.byteLength(content, 'utf8') / 1024;
        
        // Polyfill chunks should not be too large
        expect(sizeKB).toBeLessThan(300);
        
        console.log(`Polyfill chunk ${chunk}: ${Math.round(sizeKB)}KB`);
      }
    });
  });
});
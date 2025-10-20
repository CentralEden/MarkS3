#!/usr/bin/env node

/**
 * AWS SDK Browser Compatibility Validation Script
 * Validates that the built application has proper AWS SDK browser compatibility
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import chalk from 'chalk';

const BUILD_PATH = resolve(process.cwd(), 'build');
const ASSETS_PATH = join(BUILD_PATH, '_app', 'immutable');

class AWSSDKValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.bundleContent = '';
    this.bundleFiles = [];
  }

  /**
   * Find all JavaScript bundle files
   */
  findJsFiles(dir) {
    const files = [];
    if (!existsSync(dir)) return files;
    
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...this.findJsFiles(fullPath));
      } else if (item.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  /**
   * Load bundle content for analysis
   */
  loadBundleContent() {
    console.log(chalk.yellow('📦 Loading bundle content...'));
    
    if (!existsSync(BUILD_PATH)) {
      this.errors.push('Build directory not found. Run "pnpm build" first.');
      return false;
    }
    
    this.bundleFiles = this.findJsFiles(ASSETS_PATH);
    
    if (this.bundleFiles.length === 0) {
      this.errors.push('No JavaScript bundle files found in build output.');
      return false;
    }
    
    // Read all bundle content
    this.bundleContent = this.bundleFiles
      .map(file => {
        try {
          return readFileSync(file, 'utf-8');
        } catch (error) {
          this.warnings.push(`Failed to read ${file}: ${error.message}`);
          return '';
        }
      })
      .join('\n');
    
    console.log(chalk.green(`✅ Loaded ${this.bundleFiles.length} bundle files`));
    return true;
  }

  /**
   * Validate AWS SDK S3 client compatibility
   */
  validateS3Client() {
    console.log(chalk.yellow('🪣 Validating S3 client compatibility...'));
    
    const checks = [
      { name: 'S3Client', pattern: /S3Client/, required: true },
      { name: 'GetObjectCommand', pattern: /GetObjectCommand/, required: true },
      { name: 'PutObjectCommand', pattern: /PutObjectCommand/, required: true },
      { name: 'ListObjectsV2Command', pattern: /ListObjectsV2Command/, required: true },
      { name: 'DeleteObjectCommand', pattern: /DeleteObjectCommand/, required: true }
    ];
    
    let passed = 0;
    for (const check of checks) {
      if (this.bundleContent.match(check.pattern)) {
        console.log(chalk.green(`  ✅ ${check.name} found`));
        passed++;
      } else if (check.required) {
        this.errors.push(`Required S3 component missing: ${check.name}`);
        console.log(chalk.red(`  ❌ ${check.name} missing`));
      } else {
        this.warnings.push(`Optional S3 component missing: ${check.name}`);
        console.log(chalk.yellow(`  ⚠️  ${check.name} missing`));
      }
    }
    
    return passed > 0;
  }

  /**
   * Validate Cognito client compatibility
   */
  validateCognitoClient() {
    console.log(chalk.yellow('🔐 Validating Cognito client compatibility...'));
    
    const checks = [
      { name: 'CognitoIdentityClient', pattern: /CognitoIdentityClient/, required: true },
      { name: 'CognitoIdentityProviderClient', pattern: /CognitoIdentityProviderClient/, required: true },
      { name: 'InitiateAuthCommand', pattern: /InitiateAuthCommand/, required: true },
      { name: 'GetUserCommand', pattern: /GetUserCommand/, required: true },
      { name: 'GetIdCommand', pattern: /GetIdCommand/, required: true },
      { name: 'GetCredentialsForIdentityCommand', pattern: /GetCredentialsForIdentityCommand/, required: true }
    ];
    
    let passed = 0;
    for (const check of checks) {
      if (this.bundleContent.match(check.pattern)) {
        console.log(chalk.green(`  ✅ ${check.name} found`));
        passed++;
      } else if (check.required) {
        this.errors.push(`Required Cognito component missing: ${check.name}`);
        console.log(chalk.red(`  ❌ ${check.name} missing`));
      } else {
        this.warnings.push(`Optional Cognito component missing: ${check.name}`);
        console.log(chalk.yellow(`  ⚠️  ${check.name} missing`));
      }
    }
    
    return passed > 0;
  }

  /**
   * Validate browser-compatible HTTP handlers
   */
  validateHttpHandlers() {
    console.log(chalk.yellow('🌐 Validating HTTP handlers...'));
    
    const browserHandlers = [
      'FetchHttpHandler',
      'fetch-http-handler',
      'XhrHttpHandler'
    ];
    
    const nodeHandlers = [
      'NodeHttpHandler',
      'node-http-handler'
    ];
    
    let foundBrowserHandler = false;
    for (const handler of browserHandlers) {
      if (this.bundleContent.includes(handler)) {
        console.log(chalk.green(`  ✅ Browser handler found: ${handler}`));
        foundBrowserHandler = true;
      }
    }
    
    if (!foundBrowserHandler) {
      this.errors.push('No browser-compatible HTTP handlers found');
    }
    
    for (const handler of nodeHandlers) {
      if (this.bundleContent.includes(handler)) {
        this.errors.push(`Node.js-specific handler found: ${handler}`);
        console.log(chalk.red(`  ❌ Node.js handler found: ${handler}`));
      }
    }
    
    return foundBrowserHandler;
  }

  /**
   * Validate credential providers
   */
  validateCredentialProviders() {
    console.log(chalk.yellow('🔑 Validating credential providers...'));
    
    const browserProviders = [
      'fromCognitoIdentity',
      'fromWebToken',
      'credential-provider-cognito-identity'
    ];
    
    const nodeProviders = [
      'credential-provider-node',
      'credential-provider-ini',
      'credential-provider-process',
      'credential-provider-sso',
      'credential-provider-ec2',
      'credential-provider-ecs'
    ];
    
    let foundBrowserProvider = false;
    for (const provider of browserProviders) {
      if (this.bundleContent.includes(provider)) {
        console.log(chalk.green(`  ✅ Browser provider found: ${provider}`));
        foundBrowserProvider = true;
      }
    }
    
    if (!foundBrowserProvider) {
      this.warnings.push('No browser-compatible credential providers found');
    }
    
    for (const provider of nodeProviders) {
      if (this.bundleContent.includes(provider)) {
        this.errors.push(`Node.js-specific provider found: ${provider}`);
        console.log(chalk.red(`  ❌ Node.js provider found: ${provider}`));
      }
    }
    
    return foundBrowserProvider;
  }

  /**
   * Validate polyfills
   */
  validatePolyfills() {
    console.log(chalk.yellow('🔧 Validating polyfills...'));
    
    const polyfills = [
      { name: 'Buffer', pattern: /Buffer|_buffer/, required: true },
      { name: 'Process', pattern: /process\.env|process\.browser/, required: true },
      { name: 'Crypto', pattern: /createHash|createHmac|crypto-browserify/, required: true },
      { name: 'Stream', pattern: /Readable|Transform|readable-stream/, required: true }
    ];
    
    let passed = 0;
    for (const polyfill of polyfills) {
      if (this.bundleContent.match(polyfill.pattern)) {
        console.log(chalk.green(`  ✅ ${polyfill.name} polyfill found`));
        passed++;
      } else if (polyfill.required) {
        this.errors.push(`Required polyfill missing: ${polyfill.name}`);
        console.log(chalk.red(`  ❌ ${polyfill.name} polyfill missing`));
      }
    }
    
    return passed > 0;
  }

  /**
   * Validate error handling
   */
  validateErrorHandling() {
    console.log(chalk.yellow('⚠️  Validating error handling...'));
    
    const errorComponents = [
      { name: 'AWS Error Types', pattern: /ServiceException|NoSuchKey|AccessDenied/, required: true },
      { name: 'Retry Logic', pattern: /retry|RetryMode|maxAttempts/, required: true },
      { name: 'Custom Error Handling', pattern: /WikiError|ErrorCodes/, required: true },
      { name: 'Error Utilities', pattern: /executeWithRetry|createUserFriendlyError/, required: true }
    ];
    
    let passed = 0;
    for (const component of errorComponents) {
      if (this.bundleContent.match(component.pattern)) {
        console.log(chalk.green(`  ✅ ${component.name} found`));
        passed++;
      } else if (component.required) {
        this.errors.push(`Required error handling component missing: ${component.name}`);
        console.log(chalk.red(`  ❌ ${component.name} missing`));
      }
    }
    
    return passed > 0;
  }

  /**
   * Validate bundle optimization
   */
  validateBundleOptimization() {
    console.log(chalk.yellow('📊 Validating bundle optimization...'));
    
    // Check for unused AWS services
    const unusedServices = [
      'DynamoDBClient',
      'LambdaClient',
      'EC2Client',
      'RDSClient',
      'SQSClient',
      'SNSClient'
    ];
    
    for (const service of unusedServices) {
      if (this.bundleContent.includes(service)) {
        this.warnings.push(`Unused AWS service found in bundle: ${service}`);
        console.log(chalk.yellow(`  ⚠️  Unused service: ${service}`));
      }
    }
    
    // Check chunk splitting
    const awsChunks = this.bundleFiles.filter(file => 
      file.includes('aws-') || file.includes('cognito') || file.includes('s3')
    );
    
    if (awsChunks.length > 0) {
      console.log(chalk.green(`  ✅ AWS SDK properly chunked (${awsChunks.length} chunks)`));
    } else {
      this.warnings.push('AWS SDK not properly chunked');
    }
    
    // Check polyfill chunking
    const polyfillChunks = this.bundleFiles.filter(file => 
      file.includes('polyfill')
    );
    
    if (polyfillChunks.length > 0) {
      console.log(chalk.green(`  ✅ Polyfills properly chunked (${polyfillChunks.length} chunks)`));
    } else {
      this.warnings.push('Polyfills not properly chunked');
    }
    
    return true;
  }

  /**
   * Display validation summary
   */
  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.blue.bold('📋 AWS SDK Browser Compatibility Summary'));
    console.log('='.repeat(60));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('🎉 All AWS SDK validations passed!'));
      console.log(chalk.green('✅ Application is ready for browser deployment'));
    } else {
      if (this.errors.length > 0) {
        console.log(chalk.red.bold(`❌ ${this.errors.length} Critical Issue(s):`));
        this.errors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
      }

      if (this.warnings.length > 0) {
        console.log(chalk.yellow.bold(`⚠️  ${this.warnings.length} Warning(s):`));
        this.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }
    }

    console.log('='.repeat(60));

    if (this.errors.length > 0) {
      console.log(chalk.red.bold('❌ AWS SDK browser compatibility validation failed!'));
      console.log(chalk.red('The application may not work correctly in browser environments.'));
      return false;
    } else {
      console.log(chalk.green.bold('✅ AWS SDK browser compatibility validation passed!'));
      console.log(chalk.green('The application should work correctly in browser environments.'));
      return true;
    }
  }

  /**
   * Run complete validation
   */
  async validate() {
    console.log(chalk.blue.bold('🚀 Starting AWS SDK Browser Compatibility Validation...\n'));

    if (!this.loadBundleContent()) {
      this.displaySummary();
      return false;
    }

    // Run all validations
    this.validateS3Client();
    this.validateCognitoClient();
    this.validateHttpHandlers();
    this.validateCredentialProviders();
    this.validatePolyfills();
    this.validateErrorHandling();
    this.validateBundleOptimization();

    return this.displaySummary();
  }
}

// Run validation
const validator = new AWSSDKValidator();
validator.validate().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});

export { AWSSDKValidator };
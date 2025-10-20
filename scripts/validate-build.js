#!/usr/bin/env node

/**
 * Comprehensive build validation script
 * Runs build process and validates output
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';

const PROJECT_ROOT = resolve(process.cwd());
const DIST_PATH = resolve(PROJECT_ROOT, 'dist');

class BuildValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Run a command and return promise
   */
  runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      console.log(chalk.blue(`Running: ${command} ${args.join(' ')}`));
      
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Clean previous build
   */
  async cleanBuild() {
    console.log(chalk.yellow('🧹 Cleaning previous build...'));
    
    try {
      if (existsSync(DIST_PATH)) {
        await this.runCommand('rm', ['-rf', 'dist'], { cwd: PROJECT_ROOT });
      }
      console.log(chalk.green('✅ Build cleaned'));
    } catch (error) {
      this.warnings.push('Failed to clean build directory');
      console.log(chalk.yellow('⚠️  Could not clean build directory'));
    }
  }

  /**
   * Run TypeScript check
   */
  async checkTypes() {
    console.log(chalk.yellow('🔍 Checking TypeScript types...'));
    
    try {
      await this.runCommand('pnpm', ['check'], { cwd: PROJECT_ROOT });
      console.log(chalk.green('✅ TypeScript check passed'));
    } catch (error) {
      this.errors.push('TypeScript check failed');
      throw error;
    }
  }

  /**
   * Run linting
   */
  async runLinting() {
    console.log(chalk.yellow('🔍 Running linting...'));
    
    try {
      await this.runCommand('pnpm', ['lint'], { cwd: PROJECT_ROOT });
      console.log(chalk.green('✅ Linting passed'));
    } catch (error) {
      this.warnings.push('Linting failed');
      console.log(chalk.yellow('⚠️  Linting issues found'));
    }
  }

  /**
   * Build the application
   */
  async buildApplication() {
    console.log(chalk.yellow('🏗️  Building application...'));
    
    try {
      await this.runCommand('pnpm', ['build'], { cwd: PROJECT_ROOT });
      console.log(chalk.green('✅ Build completed'));
    } catch (error) {
      this.errors.push('Build failed');
      throw error;
    }
  }

  /**
   * Run build validation tests
   */
  async runBuildTests() {
    console.log(chalk.yellow('🧪 Running build validation tests...'));
    
    try {
      await this.runCommand('pnpm', ['test:build'], { cwd: PROJECT_ROOT });
      console.log(chalk.green('✅ Build validation tests passed'));
    } catch (error) {
      this.errors.push('Build validation tests failed');
      throw error;
    }
  }

  /**
   * Run bundle analysis
   */
  async analyzeBundles() {
    console.log(chalk.yellow('📊 Analyzing bundle sizes...'));
    
    try {
      await this.runCommand('pnpm', ['bundle:monitor'], { cwd: PROJECT_ROOT });
      console.log(chalk.green('✅ Bundle analysis completed'));
    } catch (error) {
      this.warnings.push('Bundle analysis failed');
      console.log(chalk.yellow('⚠️  Bundle analysis issues found'));
    }
  }

  /**
   * Validate build output structure
   */
  validateBuildStructure() {
    console.log(chalk.yellow('🔍 Validating build structure...'));
    
    const requiredFiles = [
      'dist/index.html',
      'dist/assets'
    ];

    for (const file of requiredFiles) {
      const filePath = resolve(PROJECT_ROOT, file);
      if (!existsSync(filePath)) {
        this.errors.push(`Required build file missing: ${file}`);
      }
    }

    if (this.errors.length === 0) {
      console.log(chalk.green('✅ Build structure validation passed'));
    }
  }

  /**
   * Display summary
   */
  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.blue.bold('📋 Build Validation Summary'));
    console.log('='.repeat(60));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('🎉 All validations passed!'));
    } else {
      if (this.errors.length > 0) {
        console.log(chalk.red.bold(`❌ ${this.errors.length} Error(s):`));
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
      console.log(chalk.red.bold('❌ Build validation failed!'));
      process.exit(1);
    } else {
      console.log(chalk.green.bold('✅ Build validation completed successfully!'));
    }
  }

  /**
   * Run complete validation process
   */
  async validate() {
    console.log(chalk.blue.bold('🚀 Starting build validation process...\n'));

    try {
      // Pre-build checks
      await this.cleanBuild();
      await this.checkTypes();
      await this.runLinting();

      // Build process
      await this.buildApplication();

      // Post-build validation
      this.validateBuildStructure();
      await this.runBuildTests();
      await this.analyzeBundles();

    } catch (error) {
      console.error(chalk.red('\n❌ Build validation failed:'), error.message);
      this.errors.push(error.message);
    }

    this.displaySummary();
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new BuildValidator();
  validator.validate().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { BuildValidator };
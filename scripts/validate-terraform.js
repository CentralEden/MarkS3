#!/usr/bin/env node

/**
 * Terraform Validation Script for MarkS3
 * 
 * This script validates the Terraform configuration before deployment.
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const terraformDir = join(rootDir, 'terraform');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ Error: ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function validateTerraform() {
  try {
    log('\n🔍 Validating Terraform Configuration', 'blue');
    log('=====================================\n');

    // Check if Terraform is installed
    info('Checking Terraform installation...');
    try {
      const version = execSync('terraform version', { encoding: 'utf8' });
      success(`Terraform is installed: ${version.split('\n')[0]}`);
    } catch (err) {
      error('Terraform is not installed or not in PATH');
      return false;
    }

    // Initialize Terraform
    info('Initializing Terraform...');
    try {
      execSync('terraform init', { 
        cwd: terraformDir,
        stdio: 'pipe'
      });
      success('Terraform initialized successfully');
    } catch (err) {
      error('Failed to initialize Terraform');
      console.log(err.stdout?.toString());
      console.log(err.stderr?.toString());
      return false;
    }

    // Validate Terraform configuration
    info('Validating Terraform configuration...');
    try {
      execSync('terraform validate', { 
        cwd: terraformDir,
        stdio: 'pipe'
      });
      success('Terraform configuration is valid');
    } catch (err) {
      error('Terraform configuration validation failed');
      console.log(err.stdout?.toString());
      console.log(err.stderr?.toString());
      return false;
    }

    // Format check
    info('Checking Terraform formatting...');
    try {
      execSync('terraform fmt -check -recursive', { 
        cwd: terraformDir,
        stdio: 'pipe'
      });
      success('Terraform files are properly formatted');
    } catch (err) {
      warning('Some Terraform files need formatting');
      info('Run "terraform fmt -recursive" to fix formatting');
    }

    // Validate modules
    info('Validating Terraform modules...');
    const modules = ['s3', 'cognito', 'cloudfront'];
    
    for (const module of modules) {
      try {
        execSync('terraform validate', { 
          cwd: join(terraformDir, 'modules', module),
          stdio: 'pipe'
        });
        success(`Module ${module} is valid`);
      } catch (err) {
        error(`Module ${module} validation failed`);
        console.log(err.stdout?.toString());
        console.log(err.stderr?.toString());
        return false;
      }
    }

    log('\n🎉 All validations passed!', 'green');
    log('Your Terraform configuration is ready for deployment.\n');
    
    return true;

  } catch (err) {
    error(`Validation failed: ${err.message}`);
    return false;
  }
}

// Run validation
validateTerraform().then(success => {
  process.exit(success ? 0 : 1);
});
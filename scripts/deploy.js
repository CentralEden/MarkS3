#!/usr/bin/env node

/**
 * MarkS3 Deployment Script
 * 
 * This script handles the build-time configuration and deployment of MarkS3.
 * It reads configuration, validates inputs, applies Terraform, and builds the application.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class DeploymentError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DeploymentError';
    this.code = code;
  }
}

class MarkS3Deployer {
  constructor() {
    this.config = {};
    this.terraformOutputs = {};
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // Utility methods
  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.log(`❌ Error: ${message}`, 'red');
  }

  success(message) {
    this.log(`✅ ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'blue');
  }

  warning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
    });
  }

  // Validation methods
  validateBucketName(bucketName) {
    const bucketRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!bucketRegex.test(bucketName)) {
      throw new DeploymentError(
        'Bucket name must be lowercase, contain only letters, numbers, and hyphens, and not start or end with a hyphen.',
        'INVALID_BUCKET_NAME'
      );
    }
    if (bucketName.length < 3 || bucketName.length > 63) {
      throw new DeploymentError(
        'Bucket name must be between 3 and 63 characters long.',
        'INVALID_BUCKET_NAME'
      );
    }
  }

  validateDomainName(domainName) {
    if (!domainName) return true; // Optional
    
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})$/;
    if (!domainRegex.test(domainName)) {
      throw new DeploymentError(
        'Domain name must be a valid domain (e.g., wiki.example.com).',
        'INVALID_DOMAIN_NAME'
      );
    }
  }

  // Configuration methods
  async loadConfig() {
    const configPath = join(rootDir, 'deploy.config.json');
    
    if (existsSync(configPath)) {
      try {
        const configData = readFileSync(configPath, 'utf8');
        this.config = JSON.parse(configData);
        this.info('Loaded existing configuration from deploy.config.json');
        return true;
      } catch (error) {
        this.warning('Failed to load existing configuration, will create new one');
      }
    }
    
    return false;
  }

  async promptForConfig() {
    this.log('\\n🚀 MarkS3 Deployment Configuration', 'bright');
    this.log('=====================================\\n');

    // Project name
    const projectName = await this.question('Project name (default: marks3): ') || 'marks3';
    
    // Environment
    const environment = await this.question('Environment (dev/staging/prod, default: prod): ') || 'prod';
    
    // AWS Region
    const awsRegion = await this.question('AWS Region (default: us-east-1): ') || 'us-east-1';
    
    // Bucket name
    let bucketName;
    while (!bucketName) {
      const input = await this.question('S3 Bucket name (must be globally unique): ');
      try {
        this.validateBucketName(input);
        bucketName = input;
      } catch (error) {
        this.error(error.message);
      }
    }

    // Domain name (optional)
    let domainName = '';
    const useDomain = await this.question('Do you want to use a custom domain? (y/N): ');
    if (useDomain.toLowerCase() === 'y' || useDomain.toLowerCase() === 'yes') {
      while (true) {
        const input = await this.question('Custom domain name (e.g., wiki.example.com): ');
        try {
          this.validateDomainName(input);
          domainName = input;
          break;
        } catch (error) {
          this.error(error.message);
        }
      }

      // DNS configuration
      if (domainName) {
        const createHostedZone = await this.question('Create new Route53 hosted zone? (Y/n): ');
        const shouldCreateHostedZone = createHostedZone.toLowerCase() !== 'n' && createHostedZone.toLowerCase() !== 'no';
        
        let hostedZoneId = '';
        if (!shouldCreateHostedZone) {
          hostedZoneId = await this.question('Existing Route53 hosted zone ID (optional): ') || '';
        }

        this.config.createHostedZone = shouldCreateHostedZone;
        this.config.hostedZoneId = hostedZoneId;
      }
    }

    // Guest access
    const enableGuestAccess = await this.question('Enable guest access by default? (Y/n): ');
    const guestAccess = enableGuestAccess.toLowerCase() !== 'n' && enableGuestAccess.toLowerCase() !== 'no';

    // Cognito User Pool name
    const cognitoUserPoolName = await this.question(`Cognito User Pool name (default: ${projectName}-${environment}-users): `) || `${projectName}-${environment}-users`;

    this.config = {
      projectName,
      environment,
      awsRegion,
      bucketName,
      domainName,
      enableGuestAccess: guestAccess,
      cognitoUserPoolName,
      ...this.config // Preserve DNS settings if set above
    };

    // Save configuration
    const configPath = join(rootDir, 'deploy.config.json');
    writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    this.success('Configuration saved to deploy.config.json');
  }

  // Terraform methods
  async checkTerraformInstalled() {
    try {
      execSync('terraform version', { stdio: 'pipe' });
      return true;
    } catch (error) {
      throw new DeploymentError(
        'Terraform is not installed or not in PATH. Please install Terraform first.',
        'TERRAFORM_NOT_FOUND'
      );
    }
  }

  async checkAWSCredentials() {
    try {
      execSync('aws sts get-caller-identity', { stdio: 'pipe' });
      return true;
    } catch (error) {
      throw new DeploymentError(
        'AWS credentials not configured. Please run "aws configure" first.',
        'AWS_CREDENTIALS_NOT_FOUND'
      );
    }
  }

  async initTerraform() {
    this.info('Initializing Terraform...');
    try {
      execSync('terraform init', { 
        cwd: join(rootDir, 'terraform'),
        stdio: 'inherit'
      });
      this.success('Terraform initialized successfully');
    } catch (error) {
      throw new DeploymentError(
        'Failed to initialize Terraform',
        'TERRAFORM_INIT_FAILED'
      );
    }
  }

  async planTerraform() {
    this.info('Planning Terraform deployment...');
    
    const tfVars = [
      `project_name="${this.config.projectName}"`,
      `environment="${this.config.environment}"`,
      `bucket_name="${this.config.bucketName}"`,
      `aws_region="${this.config.awsRegion}"`,
      `cognito_user_pool_name="${this.config.cognitoUserPoolName}"`,
      `enable_guest_access=${this.config.enableGuestAccess}`
    ];

    if (this.config.domainName) {
      tfVars.push(`domain_name="${this.config.domainName}"`);
      tfVars.push(`create_hosted_zone=${this.config.createHostedZone || false}`);
      if (this.config.hostedZoneId) {
        tfVars.push(`hosted_zone_id="${this.config.hostedZoneId}"`);
      }
    }

    const varArgs = tfVars.map(v => `-var="${v}"`).join(' ');

    try {
      execSync(`terraform plan ${varArgs}`, {
        cwd: join(rootDir, 'terraform'),
        stdio: 'inherit'
      });
      this.success('Terraform plan completed successfully');
    } catch (error) {
      throw new DeploymentError(
        'Terraform plan failed',
        'TERRAFORM_PLAN_FAILED'
      );
    }
  }

  async applyTerraform() {
    this.info('Applying Terraform configuration...');
    
    const tfVars = [
      `project_name="${this.config.projectName}"`,
      `environment="${this.config.environment}"`,
      `bucket_name="${this.config.bucketName}"`,
      `aws_region="${this.config.awsRegion}"`,
      `cognito_user_pool_name="${this.config.cognitoUserPoolName}"`,
      `enable_guest_access=${this.config.enableGuestAccess}`
    ];

    if (this.config.domainName) {
      tfVars.push(`domain_name="${this.config.domainName}"`);
      tfVars.push(`create_hosted_zone=${this.config.createHostedZone || false}`);
      if (this.config.hostedZoneId) {
        tfVars.push(`hosted_zone_id="${this.config.hostedZoneId}"`);
      }
    }

    const varArgs = tfVars.map(v => `-var="${v}"`).join(' ');

    try {
      execSync(`terraform apply -auto-approve ${varArgs}`, {
        cwd: join(rootDir, 'terraform'),
        stdio: 'inherit'
      });
      this.success('Terraform applied successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new DeploymentError(
          `S3 bucket "${this.config.bucketName}" already exists. Please choose a different bucket name.`,
          'BUCKET_ALREADY_EXISTS'
        );
      }
      throw new DeploymentError(
        'Terraform apply failed',
        'TERRAFORM_APPLY_FAILED'
      );
    }
  }

  async getTerraformOutputs() {
    this.info('Getting Terraform outputs...');
    try {
      const output = execSync('terraform output -json', {
        cwd: join(rootDir, 'terraform'),
        encoding: 'utf8'
      });
      this.terraformOutputs = JSON.parse(output);
      this.success('Retrieved Terraform outputs');
    } catch (error) {
      throw new DeploymentError(
        'Failed to get Terraform outputs',
        'TERRAFORM_OUTPUT_FAILED'
      );
    }
  }

  // Application build methods
  async generateAppConfig() {
    this.info('Generating application configuration...');
    
    const appConfig = {
      aws: {
        region: this.config.awsRegion,
        bucketName: this.terraformOutputs.bucket_name?.value,
        cognitoUserPoolId: this.terraformOutputs.cognito_user_pool_id?.value,
        cognitoUserPoolClientId: this.terraformOutputs.cognito_user_pool_client_id?.value,
        cognitoIdentityPoolId: this.terraformOutputs.cognito_identity_pool_id?.value,
        cognitoUserPoolDomain: this.terraformOutputs.cognito_user_pool_domain?.value
      },
      app: {
        domainName: this.config.domainName || this.terraformOutputs.website_endpoint?.value,
        cloudfrontDomain: this.terraformOutputs.cloudfront_domain_name?.value,
        enableGuestAccess: this.config.enableGuestAccess
      }
    };

    // Write to environment file
    const envPath = join(rootDir, '.env.production');
    const envContent = [
      `VITE_AWS_REGION=${appConfig.aws.region}`,
      `VITE_S3_BUCKET_NAME=${appConfig.aws.bucketName}`,
      `VITE_COGNITO_USER_POOL_ID=${appConfig.aws.cognitoUserPoolId}`,
      `VITE_COGNITO_USER_POOL_CLIENT_ID=${appConfig.aws.cognitoUserPoolClientId}`,
      `VITE_COGNITO_IDENTITY_POOL_ID=${appConfig.aws.cognitoIdentityPoolId}`,
      `VITE_COGNITO_USER_POOL_DOMAIN=${appConfig.aws.cognitoUserPoolDomain}`,
      `VITE_DOMAIN_NAME=${appConfig.app.domainName}`,
      `VITE_CLOUDFRONT_DOMAIN=${appConfig.app.cloudfrontDomain || ''}`,
      `VITE_ENABLE_GUEST_ACCESS=${appConfig.app.enableGuestAccess}`
    ].join('\\n');

    writeFileSync(envPath, envContent);
    this.success('Application configuration generated');

    return appConfig;
  }

  async buildApplication() {
    this.info('Building application...');
    try {
      execSync('npm run build', {
        cwd: rootDir,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      this.success('Application built successfully');
    } catch (error) {
      throw new DeploymentError(
        'Application build failed',
        'BUILD_FAILED'
      );
    }
  }

  async uploadToS3() {
    this.info('Uploading application to S3...');
    const bucketName = this.terraformOutputs.bucket_name?.value;
    
    try {
      execSync(`aws s3 sync build/ s3://${bucketName}/ --delete`, {
        cwd: rootDir,
        stdio: 'inherit'
      });
      this.success('Application uploaded to S3');
    } catch (error) {
      throw new DeploymentError(
        'Failed to upload application to S3',
        'S3_UPLOAD_FAILED'
      );
    }
  }

  // Main deployment flow
  async deploy() {
    try {
      this.log('\\n🚀 Starting MarkS3 Deployment', 'bright');
      this.log('===============================\\n');

      // Pre-flight checks
      await this.checkTerraformInstalled();
      await this.checkAWSCredentials();

      // Configuration
      const hasConfig = await this.loadConfig();
      if (!hasConfig) {
        await this.promptForConfig();
      } else {
        const useExisting = await this.question('Use existing configuration? (Y/n): ');
        if (useExisting.toLowerCase() === 'n' || useExisting.toLowerCase() === 'no') {
          await this.promptForConfig();
        }
      }

      // Terraform deployment
      await this.initTerraform();
      await this.planTerraform();
      
      const proceed = await this.question('\\nProceed with deployment? (Y/n): ');
      if (proceed.toLowerCase() === 'n' || proceed.toLowerCase() === 'no') {
        this.info('Deployment cancelled');
        return;
      }

      await this.applyTerraform();
      await this.getTerraformOutputs();

      // Application build and deployment
      const appConfig = await this.generateAppConfig();
      await this.buildApplication();
      await this.uploadToS3();

      // Success message
      this.log('\\n🎉 Deployment completed successfully!', 'green');
      this.log('=====================================\\n');
      
      const domainName = this.config.domainName || this.terraformOutputs.website_endpoint?.value;
      this.log(`Your MarkS3 wiki is available at: ${colors.cyan}https://${domainName}${colors.reset}`);
      
      if (this.config.createHostedZone && this.terraformOutputs.hosted_zone_name_servers?.value) {
        this.log('\\n📋 DNS Configuration Required:', 'yellow');
        this.log('Update your domain registrar with these name servers:');
        this.terraformOutputs.hosted_zone_name_servers.value.forEach(ns => {
          this.log(`  - ${ns}`);
        });
      }

      this.log('\\n📖 Next steps:');
      this.log('1. Access your wiki using the URL above');
      this.log('2. Create your first admin user through the Cognito console');
      this.log('3. Start creating your wiki content!');

    } catch (error) {
      this.error(error.message);
      if (error.code) {
        this.error(`Error code: ${error.code}`);
      }
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async destroy() {
    try {
      this.log('\\n🗑️  Destroying MarkS3 Infrastructure', 'red');
      this.log('====================================\\n');

      const confirm = await this.question('Are you sure you want to destroy all resources? This cannot be undone! (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        this.info('Destruction cancelled');
        return;
      }

      await this.checkTerraformInstalled();
      await this.loadConfig();

      const tfVars = [
        `project_name="${this.config.projectName}"`,
        `environment="${this.config.environment}"`,
        `bucket_name="${this.config.bucketName}"`,
        `aws_region="${this.config.awsRegion}"`,
        `cognito_user_pool_name="${this.config.cognitoUserPoolName}"`,
        `enable_guest_access=${this.config.enableGuestAccess}`
      ];

      if (this.config.domainName) {
        tfVars.push(`domain_name="${this.config.domainName}"`);
        tfVars.push(`create_hosted_zone=${this.config.createHostedZone || false}`);
        if (this.config.hostedZoneId) {
          tfVars.push(`hosted_zone_id="${this.config.hostedZoneId}"`);
        }
      }

      const varArgs = tfVars.map(v => `-var="${v}"`).join(' ');

      execSync(`terraform destroy -auto-approve ${varArgs}`, {
        cwd: join(rootDir, 'terraform'),
        stdio: 'inherit'
      });

      this.success('Infrastructure destroyed successfully');

    } catch (error) {
      this.error(error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// CLI handling
const deployer = new MarkS3Deployer();
const command = process.argv[2];

switch (command) {
  case 'deploy':
    deployer.deploy();
    break;
  case 'destroy':
    deployer.destroy();
    break;
  default:
    console.log(`
🚀 MarkS3 Deployment Tool

Usage:
  node scripts/deploy.js deploy   - Deploy MarkS3 infrastructure and application
  node scripts/deploy.js destroy  - Destroy all MarkS3 resources

Examples:
  npm run deploy                   - Deploy using npm script
  npm run deploy:destroy           - Destroy using npm script
`);
    break;
}
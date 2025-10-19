# MarkS3 Deployment Guide

This comprehensive guide covers deploying MarkS3 to AWS, from initial setup to production deployment and ongoing maintenance.

## Table of Contents

- [Prerequisites](#prerequisites)
- [AWS Account Setup](#aws-account-setup)
- [Infrastructure Deployment](#infrastructure-deployment)
- [Application Deployment](#application-deployment)
- [Custom Domain Configuration](#custom-domain-configuration)
- [Environment Management](#environment-management)
- [Security Configuration](#security-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)
- [Cost Optimization](#cost-optimization)

## Prerequisites

### Required Tools

Ensure you have the following tools installed:

- **AWS CLI v2** - For AWS operations
- **Terraform 1.0+** - Infrastructure as Code
- **Node.js 18+** - Application runtime
- **pnpm** - Package manager
- **Git** - Version control

### Installation Commands

```bash
# AWS CLI (macOS)
brew install awscli

# AWS CLI (Windows)
winget install Amazon.AWSCLI

# AWS CLI (Linux)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Terraform (macOS)
brew install terraform

# Terraform (Windows)
winget install Hashicorp.Terraform

# Terraform (Linux)
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Node.js and pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Verify Installation

```bash
aws --version          # Should show v2.x.x
terraform --version    # Should show v1.x.x
node --version         # Should show v18.x.x or higher
pnpm --version         # Should show v8.x.x or higher
```

## AWS Account Setup

### 1. Create AWS Account

If you don't have an AWS account:

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the registration process
4. Verify your email and phone number
5. Add a payment method

### 2. Configure AWS CLI

#### Option A: Using AWS Configure

```bash
aws configure
```

Provide the following information:
- **AWS Access Key ID**: Your access key
- **AWS Secret Access Key**: Your secret key
- **Default region name**: `us-east-1` (recommended)
- **Default output format**: `json`

#### Option B: Using AWS SSO (Recommended for Organizations)

```bash
aws configure sso
```

Follow the prompts to set up SSO authentication.

#### Option C: Using Environment Variables

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### 3. Verify AWS Access

```bash
# Test AWS CLI access
aws sts get-caller-identity

# Expected output:
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### 4. Required AWS Permissions

Your AWS user/role needs the following permissions for deployment:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "cloudfront:*",
        "cognito-idp:*",
        "cognito-identity:*",
        "iam:*",
        "route53:*",
        "acm:*",
        "cloudwatch:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

**Note**: For production environments, use more restrictive policies following the principle of least privilege.

## Infrastructure Deployment

### 1. Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/marks3.git
cd marks3

# Install dependencies
pnpm install
```

### 2. Configure Environment

Create environment-specific configuration files:

#### Development Environment

```bash
# Create development configuration
cp terraform/environments/dev/terraform.tfvars.example terraform/environments/dev/terraform.tfvars
```

Edit `terraform/environments/dev/terraform.tfvars`:

```hcl
# Project Configuration
project_name = "marks3"
environment  = "dev"

# AWS Configuration
aws_region = "us-east-1"

# Domain Configuration (optional for development)
# domain_name = "dev.marks3.yourdomain.com"
# zone_id     = "Z1234567890ABC"

# Cognito Configuration
cognito_domain_prefix = "marks3-dev-auth"

# S3 Configuration
enable_versioning = true
enable_encryption = true

# CloudFront Configuration
price_class = "PriceClass_100"  # US, Canada, Europe only

# Feature Flags
enable_cloudwatch_logs = true
enable_access_logging  = true
```

#### Production Environment

```bash
# Create production configuration
cp terraform/environments/prod/terraform.tfvars.example terraform/environments/prod/terraform.tfvars
```

Edit `terraform/environments/prod/terraform.tfvars`:

```hcl
# Project Configuration
project_name = "marks3"
environment  = "prod"

# AWS Configuration
aws_region = "us-east-1"

# Domain Configuration
domain_name = "wiki.yourdomain.com"
zone_id     = "Z1234567890ABC"  # Your Route53 hosted zone ID

# Cognito Configuration
cognito_domain_prefix = "marks3-prod-auth"

# S3 Configuration
enable_versioning = true
enable_encryption = true
enable_mfa_delete = true  # Extra security for production

# CloudFront Configuration
price_class = "PriceClass_All"  # Global distribution

# Security Configuration
enable_waf = true
enable_shield_advanced = false  # Enable if you need DDoS protection

# Monitoring Configuration
enable_cloudwatch_logs = true
enable_access_logging  = true
enable_cloudtrail     = true

# Backup Configuration
enable_cross_region_replication = true
backup_retention_days = 90
```

### 3. Initialize Terraform

```bash
# Navigate to environment directory
cd terraform/environments/dev  # or prod

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Format configuration files
terraform fmt -recursive
```

### 4. Plan Infrastructure Changes

```bash
# Review what will be created
terraform plan

# Save plan to file for review
terraform plan -out=tfplan

# Review the plan file
terraform show tfplan
```

### 5. Deploy Infrastructure

```bash
# Apply the infrastructure changes
terraform apply

# Or apply the saved plan
terraform apply tfplan
```

**Expected deployment time**: 15-45 minutes (CloudFront distribution creation takes the longest)

### 6. Verify Infrastructure Deployment

```bash
# Check Terraform outputs
terraform output

# Verify S3 buckets
aws s3 ls | grep marks3

# Verify Cognito User Pool
aws cognito-idp list-user-pools --max-items 10

# Verify CloudFront distribution
aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`MarkS3 CDN`]'
```

## Application Deployment

### 1. Configure Application Environment

Create `.env` file in the project root:

```env
# Application Configuration
VITE_APP_NAME=MarkS3
VITE_APP_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0

# AWS Configuration (from Terraform outputs)
VITE_AWS_REGION=us-east-1
VITE_AWS_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_AWS_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_COGNITO_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_AWS_S3_PAGES_BUCKET=marks3-pages-prod
VITE_AWS_S3_FILES_BUCKET=marks3-files-prod
VITE_AWS_S3_WEBSITE_BUCKET=marks3-website-prod

# CloudFront Configuration
VITE_CLOUDFRONT_DOMAIN=d1234567890abc.cloudfront.net

# Custom Domain (if configured)
VITE_CUSTOM_DOMAIN=wiki.yourdomain.com

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
```

### 2. Build Application

```bash
# Return to project root
cd ../../../

# Install dependencies (if not already done)
pnpm install

# Build for production
pnpm build

# Verify build output
ls -la build/
```

### 3. Deploy to S3

#### Using Deployment Script

```bash
# Deploy to development
pnpm run deploy:dev

# Deploy to production
pnpm run deploy:prod
```

#### Manual Deployment

```bash
# Sync build files to S3 website bucket
aws s3 sync build/ s3://marks3-website-prod --delete

# Set proper content types
aws s3 cp build/ s3://marks3-website-prod --recursive \
  --exclude "*" --include "*.html" --content-type "text/html"

aws s3 cp build/ s3://marks3-website-prod --recursive \
  --exclude "*" --include "*.js" --content-type "application/javascript"

aws s3 cp build/ s3://marks3-website-prod --recursive \
  --exclude "*" --include "*.css" --content-type "text/css"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### 4. Verify Application Deployment

```bash
# Get CloudFront domain from Terraform output
terraform output cloudfront_domain

# Test the application
curl -I https://YOUR_CLOUDFRONT_DOMAIN

# Expected response:
HTTP/2 200
content-type: text/html
# ... other headers
```

## Custom Domain Configuration

### 1. Prerequisites

- **Domain Name**: You must own a domain name
- **Route53 Hosted Zone**: Domain must be managed by Route53
- **SSL Certificate**: Will be created automatically by Terraform

### 2. Configure Domain in Terraform

Update your `terraform.tfvars`:

```hcl
# Domain Configuration
domain_name = "wiki.yourdomain.com"
zone_id     = "Z1234567890ABC"  # Your Route53 hosted zone ID
```

### 3. Find Your Hosted Zone ID

```bash
# List your hosted zones
aws route53 list-hosted-zones

# Find your domain and note the zone ID
# Example output:
{
    "HostedZones": [
        {
            "Id": "/hostedzone/Z1234567890ABC",
            "Name": "yourdomain.com.",
            "CallerReference": "...",
            ...
        }
    ]
}
```

### 4. Deploy Domain Configuration

```bash
# Apply Terraform changes
terraform plan
terraform apply

# This will:
# 1. Create SSL certificate in ACM
# 2. Validate certificate via DNS
# 3. Update CloudFront distribution
# 4. Create Route53 records
```

### 5. Verify Domain Setup

```bash
# Check certificate status
aws acm list-certificates --region us-east-1

# Test domain access
curl -I https://wiki.yourdomain.com

# Check DNS resolution
nslookup wiki.yourdomain.com
```

**Note**: DNS propagation can take up to 48 hours, but usually completes within a few hours.

## Environment Management

### Development Environment

#### Purpose
- Feature development and testing
- Integration testing
- Staging for production changes

#### Configuration
```hcl
# Minimal resources for cost efficiency
price_class = "PriceClass_100"
enable_waf = false
enable_cloudtrail = false
backup_retention_days = 7
```

#### Deployment Commands
```bash
cd terraform/environments/dev
terraform workspace select dev || terraform workspace new dev
terraform apply
```

### Production Environment

#### Purpose
- Live application serving users
- High availability and performance
- Enhanced security and monitoring

#### Configuration
```hcl
# Full global distribution
price_class = "PriceClass_All"
enable_waf = true
enable_cloudtrail = true
enable_cross_region_replication = true
backup_retention_days = 90
```

#### Deployment Commands
```bash
cd terraform/environments/prod
terraform workspace select prod || terraform workspace new prod
terraform apply
```

### Environment Promotion

#### Development to Production

```bash
# 1. Test in development
cd terraform/environments/dev
terraform apply

# 2. Build and test application
cd ../../../
pnpm build
pnpm test

# 3. Deploy to production
cd terraform/environments/prod
terraform apply
cd ../../../
pnpm run deploy:prod
```

## Security Configuration

### 1. Cognito Security Settings

#### Password Policy Configuration

```hcl
# In terraform/modules/cognito/main.tf
resource "aws_cognito_user_pool" "main" {
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  
  mfa_configuration = "OPTIONAL"  # or "ON" for required MFA
  
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}
```

#### Multi-Factor Authentication

```bash
# Enable MFA for a user (AWS CLI)
aws cognito-idp admin-set-user-mfa-preference \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username user@example.com \
  --sms-mfa-settings Enabled=true,PreferredMfa=true
```

### 2. S3 Security Configuration

#### Bucket Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity YOUR_OAI_ID"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::marks3-website-prod/*"
    },
    {
      "Sid": "DenyDirectAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::marks3-website-prod",
        "arn:aws:s3:::marks3-website-prod/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

#### Encryption Configuration

```hcl
# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "pages" {
  bucket = aws_s3_bucket.pages.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
      # Or use KMS: kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}
```

### 3. CloudFront Security

#### Security Headers

```hcl
# CloudFront response headers policy
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "marks3-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                   = true
    }
    
    content_type_options {
      override = true
    }
    
    frame_options {
      frame_option = "DENY"
    }
    
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
    }
  }
}
```

#### Web Application Firewall (WAF)

```hcl
# WAF Web ACL for CloudFront
resource "aws_wafv2_web_acl" "main" {
  name  = "marks3-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
}
```

## Monitoring and Logging

### 1. CloudWatch Configuration

#### Application Metrics

```hcl
# CloudWatch dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "MarkS3-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.main.id],
            ["AWS/CloudFront", "BytesDownloaded", "DistributionId", aws_cloudfront_distribution.main.id]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "CloudFront Metrics"
        }
      }
    ]
  })
}
```

#### Alarms

```hcl
# High error rate alarm
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "marks3-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "This metric monitors CloudFront 4xx error rate"
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

### 2. Application Logging

#### Client-Side Error Tracking

```typescript
// Error tracking service
class ErrorTracker {
  static init() {
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  static handleError(event: ErrorEvent) {
    this.logError({
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  }

  static handlePromiseRejection(event: PromiseRejectionEvent) {
    this.logError({
      type: 'promise',
      message: event.reason?.message || 'Unhandled promise rejection',
      stack: event.reason?.stack
    });
  }

  static async logError(error: any) {
    // Send to CloudWatch Logs
    try {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          error,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }
}
```

### 3. Access Logging

#### S3 Access Logs

```hcl
# S3 access logging
resource "aws_s3_bucket_logging" "pages" {
  bucket = aws_s3_bucket.pages.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "s3-access-logs/pages/"
}
```

#### CloudFront Access Logs

```hcl
# CloudFront access logging
resource "aws_cloudfront_distribution" "main" {
  # ... other configuration

  logging_config {
    include_cookies = false
    bucket         = aws_s3_bucket.logs.bucket_domain_name
    prefix         = "cloudfront-access-logs/"
  }
}
```

## Backup and Recovery

### 1. S3 Versioning and Backup

#### Enable Versioning

```hcl
# S3 versioning
resource "aws_s3_bucket_versioning" "pages" {
  bucket = aws_s3_bucket.pages.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle policy for old versions
resource "aws_s3_bucket_lifecycle_configuration" "pages" {
  bucket = aws_s3_bucket.pages.id

  rule {
    id     = "delete_old_versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

#### Cross-Region Replication

```hcl
# Cross-region replication
resource "aws_s3_bucket_replication_configuration" "pages" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.pages.id

  rule {
    id     = "replicate_all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.pages_backup.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

### 2. Backup Procedures

#### Automated Backup Script

```bash
#!/bin/bash
# backup-marks3.sh

set -e

ENVIRONMENT=${1:-prod}
BACKUP_BUCKET="marks3-backups-${ENVIRONMENT}"
DATE=$(date +%Y%m%d-%H%M%S)

echo "Starting MarkS3 backup for environment: $ENVIRONMENT"

# Backup pages bucket
echo "Backing up pages..."
aws s3 sync s3://marks3-pages-${ENVIRONMENT} s3://${BACKUP_BUCKET}/pages/${DATE}/ \
  --exclude "*.tmp" --exclude "*.lock"

# Backup files bucket
echo "Backing up files..."
aws s3 sync s3://marks3-files-${ENVIRONMENT} s3://${BACKUP_BUCKET}/files/${DATE}/ \
  --exclude "*.tmp" --exclude "*.lock"

# Backup Cognito users (export to JSON)
echo "Backing up users..."
aws cognito-idp list-users --user-pool-id $(terraform output -raw cognito_user_pool_id) \
  > /tmp/users-${DATE}.json

aws s3 cp /tmp/users-${DATE}.json s3://${BACKUP_BUCKET}/cognito/users-${DATE}.json

# Backup Terraform state
echo "Backing up Terraform state..."
aws s3 cp terraform.tfstate s3://${BACKUP_BUCKET}/terraform/terraform-${DATE}.tfstate

echo "Backup completed successfully"
```

### 3. Recovery Procedures

#### Disaster Recovery Plan

```bash
#!/bin/bash
# restore-marks3.sh

set -e

ENVIRONMENT=${1:-prod}
BACKUP_DATE=${2}
BACKUP_BUCKET="marks3-backups-${ENVIRONMENT}"

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <environment> <backup-date>"
  echo "Example: $0 prod 20241201-143000"
  exit 1
fi

echo "Starting MarkS3 restore for environment: $ENVIRONMENT from backup: $BACKUP_DATE"

# Restore pages
echo "Restoring pages..."
aws s3 sync s3://${BACKUP_BUCKET}/pages/${BACKUP_DATE}/ s3://marks3-pages-${ENVIRONMENT} \
  --delete

# Restore files
echo "Restoring files..."
aws s3 sync s3://${BACKUP_BUCKET}/files/${BACKUP_DATE}/ s3://marks3-files-${ENVIRONMENT} \
  --delete

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "Restore completed successfully"
```

## Troubleshooting

### Common Deployment Issues

#### 1. Terraform State Lock

**Problem**: Terraform state is locked

```bash
# Error: Error acquiring the state lock
```

**Solution**:
```bash
# Force unlock (use with caution)
terraform force-unlock LOCK_ID

# Or wait for the lock to expire (usually 15 minutes)
```

#### 2. CloudFront Distribution Creation Timeout

**Problem**: CloudFront distribution takes too long to create

**Solution**:
```bash
# Check distribution status
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID

# CloudFront deployments can take 15-45 minutes
# This is normal AWS behavior
```

#### 3. Certificate Validation Failure

**Problem**: SSL certificate validation fails

**Solution**:
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn YOUR_CERT_ARN

# Ensure DNS records are created in Route53
aws route53 list-resource-record-sets --hosted-zone-id YOUR_ZONE_ID

# Manual validation if needed
aws acm resend-validation-email --certificate-arn YOUR_CERT_ARN
```

#### 4. S3 Bucket Access Denied

**Problem**: Cannot access S3 buckets

**Solution**:
```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket marks3-pages-prod

# Check IAM permissions
aws iam get-user-policy --user-name your-username --policy-name your-policy

# Test bucket access
aws s3 ls s3://marks3-pages-prod
```

### Performance Issues

#### 1. Slow Page Loading

**Diagnosis**:
```bash
# Check CloudFront cache hit ratio
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=YOUR_DISTRIBUTION_ID \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

**Solutions**:
- Optimize caching headers
- Enable compression
- Use WebP images
- Implement service worker caching

#### 2. High AWS Costs

**Diagnosis**:
```bash
# Check AWS costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

**Solutions**:
- Implement S3 Intelligent Tiering
- Optimize CloudFront price class
- Set up lifecycle policies
- Monitor and alert on costs

## Cost Optimization

### 1. S3 Cost Optimization

#### Intelligent Tiering

```hcl
# S3 Intelligent Tiering
resource "aws_s3_bucket_intelligent_tiering_configuration" "pages" {
  bucket = aws_s3_bucket.pages.id
  name   = "EntireBucket"

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 125
  }
}
```

#### Lifecycle Policies

```hcl
# Lifecycle policy for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    id     = "transition_to_ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
  }
}
```

### 2. CloudFront Cost Optimization

#### Price Class Configuration

```hcl
# Optimize for specific regions
resource "aws_cloudfront_distribution" "main" {
  price_class = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"
  
  # PriceClass_100: US, Canada, Europe
  # PriceClass_200: US, Canada, Europe, Asia, Middle East, Africa
  # PriceClass_All: All edge locations (highest cost)
}
```

### 3. Monitoring Costs

#### Cost Alerts

```hcl
# CloudWatch billing alarm
resource "aws_cloudwatch_metric_alarm" "billing" {
  alarm_name          = "marks3-billing-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"
  statistic           = "Maximum"
  threshold           = "50"  # Alert if monthly cost exceeds $50
  alarm_description   = "This metric monitors estimated charges"
  
  dimensions = {
    Currency = "USD"
  }

  alarm_actions = [aws_sns_topic.billing_alerts.arn]
}
```

### 4. Resource Cleanup

#### Cleanup Script

```bash
#!/bin/bash
# cleanup-unused-resources.sh

echo "Cleaning up unused MarkS3 resources..."

# Remove incomplete multipart uploads
aws s3api list-multipart-uploads --bucket marks3-files-prod \
  --query 'Uploads[?InitiatedBefore<`2024-01-01`].[Key,UploadId]' \
  --output text | while read key upload_id; do
    aws s3api abort-multipart-upload \
      --bucket marks3-files-prod \
      --key "$key" \
      --upload-id "$upload_id"
done

# Remove old CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/marks3/" \
  --query 'logGroups[].logGroupName' --output text | while read log_group; do
    aws logs put-retention-policy \
      --log-group-name "$log_group" \
      --retention-in-days 30
done

echo "Cleanup completed"
```

---

This deployment guide provides comprehensive instructions for deploying MarkS3 to AWS. For additional support, refer to the [troubleshooting section](#troubleshooting) or create an issue in the GitHub repository.
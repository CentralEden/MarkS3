# MarkS3 Terraform Infrastructure

This directory contains the Terraform configuration for deploying MarkS3 infrastructure on AWS.

## Prerequisites

1. **Terraform** (>= 1.0) - [Install Terraform](https://developer.hashicorp.com/terraform/downloads)
2. **AWS CLI** - [Install AWS CLI](https://aws.amazon.com/cli/)
3. **AWS Credentials** - Configure with `aws configure`

## Quick Start

The easiest way to deploy MarkS3 is using the deployment script:

```bash
# From the project root
npm run deploy
```

This will:
1. Prompt you for configuration
2. Initialize and apply Terraform
3. Build and deploy the application
4. Provide you with the final URL

## Manual Deployment

If you prefer to run Terraform manually:

### 1. Initialize Terraform

```bash
cd terraform
terraform init
```

### 2. Create terraform.tfvars

```hcl
project_name     = "marks3"
environment      = "prod"
bucket_name      = "my-unique-marks3-bucket"
domain_name      = "wiki.example.com"  # Optional
aws_region       = "us-east-1"

# DNS Configuration (if using custom domain)
create_hosted_zone = true
# hosted_zone_id   = "Z1234567890"  # If using existing zone

# Cognito Configuration
cognito_user_pool_name = "marks3-prod-users"
enable_guest_access    = true
```

### 3. Plan and Apply

```bash
terraform plan
terraform apply
```

### 4. Get Outputs

```bash
terraform output
```

## Architecture

The Terraform configuration creates:

- **S3 Bucket**: Static website hosting with proper CORS configuration
- **Cognito User Pool**: User authentication and management
- **Cognito Identity Pool**: AWS credentials for authenticated/unauthenticated users
- **IAM Roles**: Proper permissions for S3 access
- **CloudFront Distribution**: CDN with custom domain (optional)
- **Route53 Records**: DNS configuration (optional)
- **ACM Certificate**: SSL certificate for custom domain (optional)

## Modules

- `modules/s3/`: S3 bucket configuration with website hosting
- `modules/cognito/`: Cognito User Pool and Identity Pool setup
- `modules/cloudfront/`: CloudFront distribution with custom domain

## Environment-Specific Configurations

- `environments/dev/`: Development environment settings
- `environments/prod/`: Production environment settings

## Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `project_name` | Name of the project | `marks3` | No |
| `environment` | Environment (dev/staging/prod) | `prod` | No |
| `bucket_name` | S3 bucket name (must be globally unique) | - | Yes |
| `domain_name` | Custom domain name | `""` | No |
| `aws_region` | AWS region | `us-east-1` | No |
| `create_hosted_zone` | Create new Route53 hosted zone | `false` | No |
| `hosted_zone_id` | Existing Route53 hosted zone ID | `""` | No |
| `cognito_user_pool_name` | Cognito User Pool name | `""` | No |
| `enable_guest_access` | Enable guest access | `true` | No |

## Outputs

The Terraform configuration outputs all necessary values for the frontend application:

- S3 bucket information
- Cognito configuration
- CloudFront distribution details
- SSL certificate ARN
- Route53 hosted zone information

## Cleanup

To destroy all resources:

```bash
npm run deploy:destroy
```

Or manually:

```bash
cd terraform
terraform destroy
```

## Troubleshooting

### Bucket Already Exists

If you get an error that the S3 bucket already exists, choose a different `bucket_name`. S3 bucket names must be globally unique.

### AWS Permissions

Ensure your AWS credentials have the following permissions:
- S3: Full access
- Cognito: Full access
- IAM: Create/manage roles and policies
- CloudFront: Full access (if using custom domain)
- Route53: Full access (if using custom domain)
- ACM: Full access (if using custom domain)

### Certificate Validation

If using a custom domain, the SSL certificate validation may take several minutes. The process will wait for DNS validation to complete.

### DNS Configuration

If you create a new Route53 hosted zone, you'll need to update your domain registrar's name servers to point to the Route53 name servers provided in the output.

## Security Considerations

- The S3 bucket allows public read access for the website content
- Authenticated users get full read/write access to the bucket
- Guest users (if enabled) get read-only access to specific prefixes
- All communication is encrypted with HTTPS
- Cognito handles user authentication securely

## Cost Optimization

- CloudFront uses PriceClass_100 (US, Canada, Europe)
- S3 versioning is enabled for data protection
- No NAT gateways or EC2 instances - purely serverless
- Cognito free tier covers up to 50,000 MAUs

## Support

For issues with the Terraform configuration, please check:
1. AWS credentials and permissions
2. Terraform version compatibility
3. AWS service limits in your region
4. Domain name availability (if using custom domain)
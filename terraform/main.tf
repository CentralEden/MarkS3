# Main Terraform configuration for MarkS3

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = var.tags
  }
}

# Provider for ACM certificates (must be in us-east-1 for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  
  default_tags {
    tags = var.tags
  }
}

# Local values for resource naming
locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  bucket_name     = var.bucket_name
  domain_name     = var.domain_name != "" ? var.domain_name : null
  
  # Cognito User Pool name
  user_pool_name = var.cognito_user_pool_name != "" ? var.cognito_user_pool_name : "${local.resource_prefix}-users"
}

# S3 Module
module "s3" {
  source = "./modules/s3"
  
  bucket_name     = local.bucket_name
  resource_prefix = local.resource_prefix
  domain_name     = local.domain_name
  
  tags = var.tags
}

# Cognito Module
module "cognito" {
  source = "./modules/cognito"
  
  user_pool_name      = local.user_pool_name
  resource_prefix     = local.resource_prefix
  bucket_arn          = module.s3.bucket_arn
  enable_guest_access = var.enable_guest_access
  domain_name         = local.domain_name
  
  tags = var.tags
}

# CloudFront Module (only if domain is specified)
module "cloudfront" {
  source = "./modules/cloudfront"
  count  = local.domain_name != null ? 1 : 0
  
  bucket_name               = local.bucket_name
  bucket_domain_name        = module.s3.bucket_domain_name
  bucket_regional_domain_name = module.s3.bucket_regional_domain_name
  domain_name               = local.domain_name
  create_hosted_zone        = var.create_hosted_zone
  hosted_zone_id            = var.hosted_zone_id
  resource_prefix           = local.resource_prefix
  
  tags = var.tags
  
  providers = {
    aws.us_east_1 = aws.us_east_1
  }
}
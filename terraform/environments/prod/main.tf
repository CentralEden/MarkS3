# Production environment configuration for MarkS3

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Use the root module with production-specific defaults
module "marks3_prod" {
  source = "../.."

  # Production-specific variables
  project_name     = var.project_name
  environment      = "prod"
  bucket_name      = var.bucket_name
  domain_name      = var.domain_name
  aws_region       = var.aws_region
  
  # Production settings
  enable_guest_access = var.enable_guest_access
  create_hosted_zone  = var.create_hosted_zone
  hosted_zone_id      = var.hosted_zone_id
  
  tags = {
    Environment = "production"
    Project     = "MarkS3"
    ManagedBy   = "Terraform"
  }
}

# Output all values from the root module
output "bucket_name" {
  value = module.marks3_prod.bucket_name
}

output "bucket_arn" {
  value = module.marks3_prod.bucket_arn
}

output "website_endpoint" {
  value = module.marks3_prod.website_endpoint
}

output "cognito_user_pool_id" {
  value = module.marks3_prod.cognito_user_pool_id
}

output "cognito_user_pool_client_id" {
  value = module.marks3_prod.cognito_user_pool_client_id
}

output "cognito_identity_pool_id" {
  value = module.marks3_prod.cognito_identity_pool_id
}

output "cloudfront_distribution_id" {
  value = module.marks3_prod.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  value = module.marks3_prod.cloudfront_domain_name
}

output "certificate_arn" {
  value = module.marks3_prod.certificate_arn
}

output "hosted_zone_id" {
  value = module.marks3_prod.hosted_zone_id
}

output "app_config" {
  value = module.marks3_prod.app_config
}
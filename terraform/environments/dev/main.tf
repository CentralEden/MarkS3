# Development environment configuration for MarkS3

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Use the root module with dev-specific defaults
module "marks3_dev" {
  source = "../.."

  # Development-specific variables
  project_name     = var.project_name
  environment      = "dev"
  bucket_name      = var.bucket_name
  domain_name      = var.domain_name
  aws_region       = var.aws_region
  
  # Dev defaults
  enable_guest_access = true
  create_hosted_zone  = false
  
  tags = {
    Environment = "development"
    Project     = "MarkS3"
    ManagedBy   = "Terraform"
  }
}

# Output all values from the root module
output "bucket_name" {
  value = module.marks3_dev.bucket_name
}

output "bucket_arn" {
  value = module.marks3_dev.bucket_arn
}

output "website_endpoint" {
  value = module.marks3_dev.website_endpoint
}

output "cognito_user_pool_id" {
  value = module.marks3_dev.cognito_user_pool_id
}

output "cognito_user_pool_client_id" {
  value = module.marks3_dev.cognito_user_pool_client_id
}

output "cognito_identity_pool_id" {
  value = module.marks3_dev.cognito_identity_pool_id
}

output "app_config" {
  value = module.marks3_dev.app_config
}
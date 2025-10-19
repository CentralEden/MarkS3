# Outputs for MarkS3 Terraform Infrastructure

# S3 Outputs
output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = module.s3.bucket_name
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = module.s3.bucket_arn
}

output "bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = module.s3.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = module.s3.bucket_regional_domain_name
}

output "website_endpoint" {
  description = "Website endpoint of the S3 bucket"
  value       = module.s3.website_endpoint
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.cognito.user_pool_client_id
}

output "cognito_identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = module.cognito.identity_pool_id
}

output "cognito_user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = module.cognito.user_pool_domain
}

# CloudFront Outputs (only if domain is specified)
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = length(module.cloudfront) > 0 ? module.cloudfront[0].distribution_id : null
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = length(module.cloudfront) > 0 ? module.cloudfront[0].distribution_domain_name : null
}

output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = length(module.cloudfront) > 0 ? module.cloudfront[0].certificate_arn : null
}

output "hosted_zone_id" {
  description = "ID of the Route53 hosted zone"
  value       = length(module.cloudfront) > 0 ? module.cloudfront[0].hosted_zone_id : null
}

# Configuration for frontend application
output "app_config" {
  description = "Configuration object for the frontend application"
  value = {
    aws_region                = var.aws_region
    bucket_name              = module.s3.bucket_name
    cognito_user_pool_id     = module.cognito.user_pool_id
    cognito_user_pool_client_id = module.cognito.user_pool_client_id
    cognito_identity_pool_id = module.cognito.identity_pool_id
    cognito_user_pool_domain = module.cognito.user_pool_domain
    domain_name              = var.domain_name != "" ? var.domain_name : module.s3.website_endpoint
    cloudfront_domain        = length(module.cloudfront) > 0 ? module.cloudfront[0].distribution_domain_name : null
  }
  sensitive = false
}
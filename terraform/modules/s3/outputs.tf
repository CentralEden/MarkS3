# Outputs for S3 module

output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.wiki_bucket.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.wiki_bucket.arn
}

output "bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.wiki_bucket.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.wiki_bucket.bucket_regional_domain_name
}

output "website_endpoint" {
  description = "Website endpoint of the S3 bucket"
  value       = aws_s3_bucket_website_configuration.wiki_bucket_website.website_endpoint
}
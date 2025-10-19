# Outputs for CloudFront module

output "distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.wiki_distribution.id
}

output "distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.wiki_distribution.arn
}

output "distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.wiki_distribution.domain_name
}

output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = aws_acm_certificate.wiki_cert.arn
}

output "hosted_zone_id" {
  description = "ID of the Route53 hosted zone"
  value       = local.hosted_zone_id
}

output "hosted_zone_name_servers" {
  description = "Name servers for the hosted zone (if created)"
  value       = var.create_hosted_zone ? aws_route53_zone.new[0].name_servers : null
}
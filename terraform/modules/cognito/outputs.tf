# Outputs for Cognito module

output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.wiki_user_pool.id
}

output "user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.wiki_user_pool.arn
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.wiki_user_pool_client.id
}

output "user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = aws_cognito_user_pool_domain.wiki_user_pool_domain.domain
}

output "identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.wiki_identity_pool.id
}

output "authenticated_role_arn" {
  description = "ARN of the authenticated IAM role"
  value       = aws_iam_role.authenticated_role.arn
}

output "unauthenticated_role_arn" {
  description = "ARN of the unauthenticated IAM role"
  value       = var.enable_guest_access ? aws_iam_role.unauthenticated_role[0].arn : null
}
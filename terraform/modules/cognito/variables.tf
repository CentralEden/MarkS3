# Variables for Cognito module

variable "user_pool_name" {
  description = "Name of the Cognito User Pool"
  type        = string
}

variable "resource_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "bucket_arn" {
  description = "ARN of the S3 bucket"
  type        = string
}

variable "enable_guest_access" {
  description = "Whether to enable guest access"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Custom domain name (optional)"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
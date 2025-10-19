# Variables for MarkS3 Terraform Infrastructure

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "marks3"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "bucket_name" {
  description = "S3 bucket name for the wiki"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must be lowercase, contain only letters, numbers, and hyphens, and not start or end with a hyphen."
  }
}

variable "domain_name" {
  description = "Custom domain name for the wiki (optional)"
  type        = string
  default     = ""
}

variable "create_hosted_zone" {
  description = "Whether to create a new Route53 hosted zone"
  type        = bool
  default     = false
}

variable "hosted_zone_id" {
  description = "Existing Route53 hosted zone ID (if not creating new one)"
  type        = string
  default     = ""
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cognito_user_pool_name" {
  description = "Name for the Cognito User Pool"
  type        = string
  default     = ""
}

variable "enable_guest_access" {
  description = "Whether to enable guest access by default"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project = "MarkS3"
    ManagedBy = "Terraform"
  }
}
# Variables for production environment

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "marks3"
}

variable "bucket_name" {
  description = "S3 bucket name for the wiki"
  type        = string
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

variable "enable_guest_access" {
  description = "Whether to enable guest access by default"
  type        = bool
  default     = true
}
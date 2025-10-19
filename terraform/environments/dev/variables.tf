# Variables for development environment

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

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
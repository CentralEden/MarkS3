# Cognito Module for MarkS3

terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "wiki_user_pool" {
  name = var.user_pool_name

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  # User attributes
  username_attributes = ["email"]
  
  # Auto-verified attributes
  auto_verified_attributes = ["email"]

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = true
    
    invite_message_template {
      email_message = "Your MarkS3 wiki username is {username} and temporary password is {####}. Please sign in and change your password."
      email_subject = "Your MarkS3 wiki account"
      sms_message   = "Your MarkS3 wiki username is {username} and temporary password is {####}."
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Schema for custom attributes
  schema {
    attribute_data_type = "String"
    name               = "role"
    required           = false
    mutable            = true
    
    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }

  tags = merge(var.tags, {
    Name = "${var.resource_prefix}-user-pool"
    Purpose = "MarkS3 User Authentication"
  })
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "wiki_user_pool_client" {
  name         = "${var.resource_prefix}-client"
  user_pool_id = aws_cognito_user_pool.wiki_user_pool.id

  # Client settings
  generate_secret = false
  
  # OAuth settings
  allowed_oauth_flows                  = ["implicit", "code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  
  # Callback URLs (will be updated based on domain)
  callback_urls = var.domain_name != null ? [
    "https://${var.domain_name}",
    "https://${var.domain_name}/",
    "http://localhost:5173",
    "http://localhost:4173"
  ] : [
    "http://localhost:5173",
    "http://localhost:4173"
  ]
  
  logout_urls = var.domain_name != null ? [
    "https://${var.domain_name}",
    "https://${var.domain_name}/",
    "http://localhost:5173",
    "http://localhost:4173"
  ] : [
    "http://localhost:5173",
    "http://localhost:4173"
  ]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Token validity
  access_token_validity  = 60    # 1 hour
  id_token_validity     = 60    # 1 hour
  refresh_token_validity = 30   # 30 days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Read and write attributes
  read_attributes  = ["email", "email_verified", "custom:role"]
  write_attributes = ["email", "custom:role"]

  # Explicit auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "wiki_user_pool_domain" {
  domain       = "${var.resource_prefix}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.wiki_user_pool.id
}

# Random string for unique domain suffix
resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Cognito Identity Pool
resource "aws_cognito_identity_pool" "wiki_identity_pool" {
  identity_pool_name               = "${var.resource_prefix}-identity-pool"
  allow_unauthenticated_identities = var.enable_guest_access

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.wiki_user_pool_client.id
    provider_name           = aws_cognito_user_pool.wiki_user_pool.endpoint
    server_side_token_check = false
  }

  tags = merge(var.tags, {
    Name = "${var.resource_prefix}-identity-pool"
    Purpose = "MarkS3 Identity Management"
  })
}

# IAM Role for authenticated users
resource "aws_iam_role" "authenticated_role" {
  name = "${var.resource_prefix}-authenticated-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.wiki_identity_pool.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.resource_prefix}-authenticated-role"
    Purpose = "MarkS3 Authenticated User Role"
  })
}

# IAM Role for unauthenticated users (guests)
resource "aws_iam_role" "unauthenticated_role" {
  count = var.enable_guest_access ? 1 : 0
  name  = "${var.resource_prefix}-unauthenticated-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.wiki_identity_pool.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "unauthenticated"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.resource_prefix}-unauthenticated-role"
    Purpose = "MarkS3 Guest User Role"
  })
}

# IAM Policy for authenticated users (full access)
resource "aws_iam_role_policy" "authenticated_policy" {
  name = "${var.resource_prefix}-authenticated-policy"
  role = aws_iam_role.authenticated_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          var.bucket_arn,
          "${var.bucket_arn}/*"
        ]
      }
    ]
  })
}

# IAM Policy for unauthenticated users (read-only access)
resource "aws_iam_role_policy" "unauthenticated_policy" {
  count = var.enable_guest_access ? 1 : 0
  name  = "${var.resource_prefix}-unauthenticated-policy"
  role  = aws_iam_role.unauthenticated_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          var.bucket_arn,
          "${var.bucket_arn}/*"
        ]
        Condition = {
          StringLike = {
            "s3:prefix" = [
              "pages/*",
              "files/*",
              "config/wiki.json"
            ]
          }
        }
      }
    ]
  })
}

# Attach roles to identity pool
resource "aws_cognito_identity_pool_roles_attachment" "wiki_identity_pool_roles" {
  identity_pool_id = aws_cognito_identity_pool.wiki_identity_pool.id

  roles = var.enable_guest_access ? {
    "authenticated"   = aws_iam_role.authenticated_role.arn
    "unauthenticated" = aws_iam_role.unauthenticated_role[0].arn
  } : {
    "authenticated" = aws_iam_role.authenticated_role.arn
  }

  # Role mapping for different user roles
  role_mapping {
    identity_provider         = "${aws_cognito_user_pool.wiki_user_pool.endpoint}:${aws_cognito_user_pool_client.wiki_user_pool_client.id}"
    ambiguous_role_resolution = "AuthenticatedRole"
    type                      = "Token"
  }
}
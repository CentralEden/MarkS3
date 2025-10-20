# S3 Module for MarkS3

# S3 Bucket for hosting the wiki
resource "aws_s3_bucket" "wiki_bucket" {
  bucket = var.bucket_name
  
  tags = merge(var.tags, {
    Name = "${var.resource_prefix}-wiki-bucket"
    Purpose = "MarkS3 Wiki Storage"
  })
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "wiki_bucket_versioning" {
  bucket = aws_s3_bucket.wiki_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "wiki_bucket_encryption" {
  bucket = aws_s3_bucket.wiki_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket public access block
resource "aws_s3_bucket_public_access_block" "wiki_bucket_pab" {
  bucket = aws_s3_bucket.wiki_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 Bucket website configuration
resource "aws_s3_bucket_website_configuration" "wiki_bucket_website" {
  bucket = aws_s3_bucket.wiki_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"  # SPA routing
  }
}

# S3 Bucket CORS configuration
resource "aws_s3_bucket_cors_configuration" "wiki_bucket_cors" {
  bucket = aws_s3_bucket.wiki_bucket.id

  cors_rule {
    allowed_headers = [
      "*",
      "Content-Type",
      "Content-Length",
      "Authorization",
      "X-Amz-Date",
      "X-Api-Key",
      "X-Amz-Security-Token"
    ]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.domain_name != null ? [
      "https://${var.domain_name}",
      "http://localhost:5173",  # Vite dev server
      "http://localhost:4173"   # Vite preview
    ] : [
      "https://${aws_s3_bucket.wiki_bucket.bucket}.s3-website-${data.aws_region.current.name}.amazonaws.com",
      "http://localhost:5173",
      "http://localhost:4173"
    ]
    expose_headers  = [
      "ETag",
      "Content-Type",
      "Content-Length",
      "Last-Modified",
      "Cache-Control"
    ]
    max_age_seconds = 86400  # 24 hours for preflight requests
  }
}

# S3 Bucket notification configuration for proper MIME types
resource "aws_s3_bucket_notification" "wiki_bucket_notification" {
  bucket = aws_s3_bucket.wiki_bucket.id
  
  lambda_function {
    lambda_function_arn = aws_lambda_function.mime_type_handler.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = ""
    filter_suffix       = ""
  }
  
  depends_on = [
    aws_lambda_permission.s3_invoke_lambda,
    aws_s3_bucket_policy.wiki_bucket_policy
  ]
}

# S3 Bucket policy for public read access and authenticated write access
resource "aws_s3_bucket_policy" "wiki_bucket_policy" {
  bucket = aws_s3_bucket.wiki_bucket.id
  
  depends_on = [aws_s3_bucket_public_access_block.wiki_bucket_pab]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.wiki_bucket.arn}/*"
      },
      {
        Sid       = "PublicReadBucket"
        Effect    = "Allow"
        Principal = "*"
        Action    = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.wiki_bucket.arn
      }
    ]
  })
}

# Data source for current AWS region
data "aws_region" "current" {}

# Data source for current AWS caller identity
data "aws_caller_identity" "current" {}

# Lambda function for setting proper MIME types on S3 objects
resource "aws_lambda_function" "mime_type_handler" {
  filename         = "${path.module}/mime-type-handler.zip"
  function_name    = "${var.resource_prefix}-mime-type-handler"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  source_code_hash = data.archive_file.mime_type_handler_zip.output_base64sha256

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.wiki_bucket.bucket
    }
  }

  tags = var.tags
}

# IAM role for Lambda function
resource "aws_iam_role" "lambda_role" {
  name = "${var.resource_prefix}-mime-type-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM policy for Lambda function
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.resource_prefix}-mime-type-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.wiki_bucket.arn}/*"
      }
    ]
  })
}

# Lambda permission for S3 to invoke the function
resource "aws_lambda_permission" "s3_invoke_lambda" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mime_type_handler.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.wiki_bucket.arn
}

# Archive file for Lambda function
data "archive_file" "mime_type_handler_zip" {
  type        = "zip"
  output_path = "${path.module}/mime-type-handler.zip"
  
  source {
    content  = file("${path.module}/mime-type-handler.js")
    filename = "index.js"
  }
}
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
    allowed_headers = ["*"]
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
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
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
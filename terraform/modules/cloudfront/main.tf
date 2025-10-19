# CloudFront Module for MarkS3

terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

# Data source for existing hosted zone (if provided)
data "aws_route53_zone" "existing" {
  count   = var.hosted_zone_id != "" ? 1 : 0
  zone_id = var.hosted_zone_id
}

# Create new hosted zone (if requested)
resource "aws_route53_zone" "new" {
  count = var.create_hosted_zone ? 1 : 0
  name  = var.domain_name

  tags = merge(var.tags, {
    Name = "${var.resource_prefix}-hosted-zone"
    Purpose = "MarkS3 DNS Management"
  })
}

# Local values for hosted zone
locals {
  hosted_zone_id = var.create_hosted_zone ? aws_route53_zone.new[0].zone_id : (
    var.hosted_zone_id != "" ? var.hosted_zone_id : null
  )
}

# SSL Certificate (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "wiki_cert" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "${var.resource_prefix}-certificate"
    Purpose = "MarkS3 SSL Certificate"
  })
}

# Certificate validation records
resource "aws_route53_record" "cert_validation" {
  for_each = local.hosted_zone_id != null ? {
    for dvo in aws_acm_certificate.wiki_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = local.hosted_zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "wiki_cert_validation" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.wiki_cert.arn
  validation_record_fqdns = local.hosted_zone_id != null ? [for record in aws_route53_record.cert_validation : record.fqdn] : null

  timeouts {
    create = "5m"
  }
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "wiki_oac" {
  name                              = "${var.resource_prefix}-oac"
  description                       = "OAC for MarkS3 S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "wiki_distribution" {
  origin {
    domain_name              = var.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.wiki_oac.id
    origin_id                = "S3-${var.bucket_name}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "MarkS3 Wiki Distribution"
  default_root_object = "index.html"

  # Aliases (custom domain)
  aliases = [var.domain_name]

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.bucket_name}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Cache behavior for API calls (no caching)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.bucket_name}"

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Cache behavior for static assets (long caching)
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.bucket_name}"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Price class
  price_class = "PriceClass_100"

  # Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL Certificate
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.wiki_cert_validation.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  tags = merge(var.tags, {
    Name = "${var.resource_prefix}-distribution"
    Purpose = "MarkS3 Content Distribution"
  })
}

# Route53 A record for the domain
resource "aws_route53_record" "wiki_domain" {
  count   = local.hosted_zone_id != null ? 1 : 0
  zone_id = local.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.wiki_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.wiki_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 AAAA record for IPv6
resource "aws_route53_record" "wiki_domain_ipv6" {
  count   = local.hosted_zone_id != null ? 1 : 0
  zone_id = local.hosted_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.wiki_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.wiki_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Update S3 bucket policy to allow CloudFront OAC
resource "aws_s3_bucket_policy" "cloudfront_oac_policy" {
  bucket = var.bucket_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "arn:aws:s3:::${var.bucket_name}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.wiki_distribution.arn
          }
        }
      },
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "arn:aws:s3:::${var.bucket_name}/*"
      },
      {
        Sid       = "PublicReadBucket"
        Effect    = "Allow"
        Principal = "*"
        Action    = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = "arn:aws:s3:::${var.bucket_name}"
      }
    ]
  })
}
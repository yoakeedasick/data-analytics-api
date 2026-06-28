variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Deployment environment (staging | production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "ecr_repo_name" {
  description = "Name of the ECR repository"
  type        = string
  default     = "data-analytics-api"
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for CSV uploads"
  type        = string
}

variable "db_username" {
  description = "RDS PostgreSQL username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "RDS PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "JWT secret key for the FastAPI application"
  type        = string
  sensitive   = true
}

variable "sns_alert_email" {
  description = "Email address to receive CloudWatch alarm notifications"
  type        = string
}

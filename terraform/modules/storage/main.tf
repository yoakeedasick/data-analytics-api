variable "environment"           { type = string }
variable "s3_bucket_name"        { type = string }
variable "db_username" {
  type      = string
  sensitive = true
}
variable "db_password" {
  type      = string
  sensitive = true
}
variable "private_subnet_ids"    { type = list(string) }
variable "rds_security_group_id" { type = string }

# ── S3 Bucket ─────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "uploads" {
  bucket        = var.s3_bucket_name
  force_destroy = var.environment != "production"
  tags          = { Name = var.s3_bucket_name, Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── RDS Subnet Group ─────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "data-analytics-${var.environment}"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "data-analytics-db-subnet-${var.environment}" }
}

# ── RDS PostgreSQL ────────────────────────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier             = "data-analytics-${var.environment}"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_encrypted      = true
  db_name                = "analytics"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]
  multi_az               = var.environment == "production" ? true : false
  skip_final_snapshot    = var.environment != "production"
  backup_retention_period = var.environment == "production" ? 7 : 0
  deletion_protection    = var.environment == "production" ? true : false
  tags                   = { Name = "data-analytics-rds-${var.environment}" }
}

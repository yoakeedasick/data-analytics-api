terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state — uncomment and fill in after creating the S3 bucket + DynamoDB table
  # backend "s3" {
  #   bucket         = "data-analytics-terraform-state"
  #   key            = "state/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   dynamodb_table = "terraform-state-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}

# ── Data sources ──────────────────────────────────────────────────────────────
data "aws_availability_zones" "available" {
  state = "available"
}

# ── Modules ───────────────────────────────────────────────────────────────────
module "networking" {
  source             = "./modules/networking"
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
}

module "security" {
  source      = "./modules/security"
  environment = var.environment
  vpc_id      = module.networking.vpc_id
}

module "storage" {
  source               = "./modules/storage"
  environment          = var.environment
  db_username          = var.db_username
  db_password          = var.db_password
  private_subnet_ids   = module.networking.private_subnet_ids
  rds_security_group_id = module.security.rds_sg_id
  s3_bucket_name       = var.s3_bucket_name
}

module "container" {
  source              = "./modules/container"
  environment         = var.environment
  aws_region          = var.aws_region
  ecr_repo_name       = var.ecr_repo_name
  private_subnet_ids  = module.networking.private_subnet_ids
  ecs_security_group_id = module.security.ecs_sg_id
  target_group_arn    = module.loadbalancer.target_group_arn
  db_host             = module.storage.rds_endpoint
  s3_bucket_name      = var.s3_bucket_name
  secret_key          = var.secret_key
  ecs_execution_role_arn = module.security.ecs_execution_role_arn
  ecs_task_role_arn   = module.security.ecs_task_role_arn
  db_username         = var.db_username
  db_password         = var.db_password
}

module "loadbalancer" {
  source             = "./modules/loadbalancer"
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  alb_security_group_id = module.security.alb_sg_id
}

module "monitoring" {
  source              = "./modules/monitoring"
  environment         = var.environment
  ecs_cluster_name    = module.container.ecs_cluster_name
  ecs_service_name    = module.container.ecs_service_name
  alb_arn_suffix      = module.loadbalancer.alb_arn_suffix
  sns_alert_email     = var.sns_alert_email
}

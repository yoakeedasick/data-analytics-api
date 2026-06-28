output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer"
  value       = module.loadbalancer.alb_dns_name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.container.ecr_repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.container.ecs_cluster_name
}

output "rds_endpoint" {
  description = "Hostname of the RDS PostgreSQL instance"
  value       = module.storage.rds_endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = module.storage.s3_bucket_name
}

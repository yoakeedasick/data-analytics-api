variable "environment"           { type = string }
variable "aws_region"            { type = string }
variable "ecr_repo_name"         { type = string }
variable "private_subnet_ids"    { type = list(string) }
variable "ecs_security_group_id" { type = string }
variable "target_group_arn"      { type = string }
variable "db_host" {
  type      = string
  sensitive = true
}
variable "s3_bucket_name"        { type = string }
variable "secret_key" {
  type      = string
  sensitive = true
}
variable "ecs_execution_role_arn" { type = string }
variable "ecs_task_role_arn"      { type = string }
variable "db_username" {
  type      = string
  sensitive = true
}
variable "db_password" {
  type      = string
  sensitive = true
}

# ── ECR Repository ────────────────────────────────────────────────────────────
resource "aws_ecr_repository" "main" {
  name                 = var.ecr_repo_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration { scan_on_push = true }
  tags = { Name = "${var.ecr_repo_name}-${var.environment}" }
}

resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.main.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ── CloudWatch Log Group ──────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/data-analytics/backend"
  retention_in_days = 30
}

# ── ECS Cluster ───────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "data-analytics-${var.environment}"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ── ECS Task Definition ───────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "backend" {
  family                   = "data-analytics-backend-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.main.repository_url}:latest"
    portMappings = [{ containerPort = 8000, protocol = "tcp" }]
    environment = [
      { name = "APP_ENV",        value = var.environment },
      { name = "DATABASE_URL",   value = "postgresql://${var.db_username}:${var.db_password}@${var.db_host}:5432/analytics" },
      { name = "S3_BUCKET_NAME", value = var.s3_bucket_name },
      { name = "AWS_REGION",     value = var.aws_region },
      { name = "SECRET_KEY",     value = var.secret_key },
      { name = "ALLOWED_ORIGINS", value = "http://localhost:5173,http://localhost:4173,http://localhost:3000" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.backend.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "backend"
      }
    }
  }])
}

# ── ECS Service ───────────────────────────────────────────────────────────────
resource "aws_ecs_service" "backend" {
  name            = "backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "backend"
    container_port   = 8000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle { ignore_changes = [task_definition] }
}

# ── Auto Scaling ──────────────────────────────────────────────────────────────
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-target-tracking-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_policy" "memory" {
  name               = "memory-target-tracking-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 80.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
  }
}

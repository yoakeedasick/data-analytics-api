variable "environment"      { type = string }
variable "ecs_cluster_name" { type = string }
variable "ecs_service_name" { type = string }
variable "alb_arn_suffix"   { type = string }
variable "sns_alert_email"  { type = string }

# ── SNS Topic ─────────────────────────────────────────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "data-analytics-alerts-${var.environment}"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.sns_alert_email
}

# ── CloudWatch Log Groups ─────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "auth" {
  name              = "/ecs/data-analytics/auth"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "upload" {
  name              = "/ecs/data-analytics/upload"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "analysis" {
  name              = "/ecs/data-analytics/analysis"
  retention_in_days = 30
}

# ── ECS CPU Alarm ─────────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.environment}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU > 80% for 10 minutes"
  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# ── ECS Memory Alarm ──────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "${var.environment}-ecs-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS Memory > 85% for 10 minutes"
  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
}

# ── ALB 5xx Error Alarm ───────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.environment}-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx errors > 10 in 1 minute"
  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
}

# ── ALB Response Time Alarm ───────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "${var.environment}-alb-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 2
  alarm_description   = "ALB p99 response time > 2 seconds"
  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
}

# ── CloudWatch Dashboard ──────────────────────────────────────────────────────
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "data-analytics-overview-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "ECS CPU & Memory"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name]
          ]
          period = 60
          stat   = "Average"
          region = "ap-southeast-1"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "ALB Request Count & 5xx Errors"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix]
          ]
          period = 60
          stat   = "Sum"
          region = "ap-southeast-1"
          view   = "timeSeries"
        }
      }
    ]
  })
}

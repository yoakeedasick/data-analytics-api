output "sns_topic_arn" {
  description = "The ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_name" {
  description = "The name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

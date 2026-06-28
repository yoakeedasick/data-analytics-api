variable "environment"          { type = string }
variable "vpc_id"               { type = string }
variable "public_subnet_ids"    { type = list(string) }
variable "alb_security_group_id"{ type = string }

# ── Application Load Balancer ─────────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "data-analytics-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production" ? true : false
  tags = { Name = "data-analytics-alb-${var.environment}" }
}

# ── Target Group ─────────────────────────────────────────────────────────────
resource "aws_lb_target_group" "backend" {
  name        = "backend-tg-${var.environment}"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    protocol            = "HTTP"
    port                = "traffic-port"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }
  tags = { Name = "backend-tg-${var.environment}" }
}

# ── HTTP redirect listener (Production only) ───────────────────────────────────
resource "aws_lb_listener" "http_redirect" {
  count             = var.environment == "production" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ── HTTPS listener (requires ACM certificate — update arn before apply) ────────
# resource "aws_lb_listener" "https" {
#   load_balancer_arn = aws_lb.main.arn
#   port              = 443
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
#   certificate_arn   = var.acm_certificate_arn
#
#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.backend.arn
#   }
# }

# ── HTTP forward listener (Staging/Dev on port 80) ─────────────────────────────
resource "aws_lb_listener" "http_staging" {
  count             = var.environment != "production" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

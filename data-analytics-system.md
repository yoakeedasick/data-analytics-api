# Hệ Thống Data Analytics API Trên AWS Với Quy Trình DevOps CI/CD

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Chức năng hệ thống](#2-chức-năng-hệ-thống)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Công nghệ sử dụng](#4-công-nghệ-sử-dụng)
5. [Quy trình hoạt động](#5-quy-trình-hoạt-động)
6. [Quy trình DevOps](#6-quy-trình-devops)
7. [Infrastructure as Code](#7-infrastructure-as-code)
8. [Bảo mật](#8-bảo-mật)
9. [Monitoring và Logging](#9-monitoring-và-logging)
10. [Kịch bản Demo](#10-kịch-bản-demo)
11. [Lợi ích đạt được](#11-lợi-ích-đạt-được)
12. [Kết luận](#12-kết-luận)

---

## 1. Giới thiệu

### 1.1 Mục tiêu

Xây dựng một hệ thống phân tích dữ liệu CSV trên nền tảng AWS theo mô hình DevOps, cho phép người dùng tải lên dữ liệu, thực hiện phân tích tự động và xem kết quả trực quan thông qua giao diện web.

Hệ thống áp dụng các thực hành DevOps hiện đại:

- Container hóa ứng dụng bằng Docker
- Quản lý hạ tầng bằng Terraform (Infrastructure as Code)
- Tích hợp và triển khai liên tục (CI/CD) bằng GitHub Actions
- Giám sát hệ thống bằng Amazon CloudWatch
- Lưu trữ dữ liệu trên Amazon S3
- Triển khai ứng dụng trên AWS ECS Fargate với Auto Scaling

### 1.2 Phạm vi hệ thống

| Thành phần | Mô tả |
|---|---|
| Region | `ap-southeast-1` (Singapore) |
| Môi trường | Staging + Production |
| Giao thức | HTTPS (qua ALB) |
| Authentication | JWT Token |
| Container runtime | AWS ECS Fargate |

---

## 2. Chức năng hệ thống

### 2.1 Chức năng người dùng

- Đăng ký / Đăng nhập tài khoản (JWT)
- Upload file CSV (tối đa 100MB)
- Xem lịch sử các file đã upload
- Thực hiện phân tích dữ liệu tự động
- Xem dashboard kết quả phân tích
- Xuất báo cáo dưới dạng PDF hoặc CSV

### 2.2 Kết quả phân tích tự động

Sau khi upload file CSV, hệ thống tự động phân tích và trả về:

| Chỉ số | Mô tả |
|---|---|
| Rows / Columns | Số lượng dòng và cột |
| Data types | Kiểu dữ liệu của từng cột |
| Missing values | Số lượng và tỷ lệ giá trị thiếu |
| Mean | Giá trị trung bình (cột số) |
| Max / Min | Giá trị lớn nhất / nhỏ nhất |
| Distribution | Phân phối dữ liệu (histogram) |
| Correlation | Ma trận tương quan giữa các cột |

### 2.3 Trực quan hóa

- Bar chart — so sánh giá trị theo nhóm
- Line chart — xu hướng theo thời gian
- Pie chart — phân bổ tỷ lệ
- Heatmap — ma trận tương quan

---

## 3. Kiến trúc hệ thống

### 3.1 Sơ đồ tổng quan

```
[Developer]
    │
    ▼
[GitHub Repository]  ── feature/develop/main branches
    │
    ▼
[GitHub Actions]  ── CI/CD Pipeline
    │
    ├── CI: checkout → install → pytest → flake8 → docker build
    │
    └── CD: push ECR → staging deploy → smoke test → approval → prod deploy
              │
              ▼
         [Amazon ECR]  ── Docker Image Registry
              │
              ▼
    ┌─────── AWS VPC (ap-southeast-1) ──────────────────┐
    │                                                     │
    │  [Public Subnet]                                    │
    │    └── Application Load Balancer (HTTPS)            │
    │          └── Internet Gateway                       │
    │                                                     │
    │  [Private Subnet]                                   │
    │    ├── ECS Fargate Cluster                          │
    │    │     ├── FastAPI Backend (task)                 │
    │    │     ├── Auto Scaling (CPU/Memory)              │
    │    │     └── IAM Task Role                          │
    │    │                                                │
    │    ├── Amazon S3  ── CSV files + versioning         │
    │    ├── Amazon RDS PostgreSQL ── metadata (Multi-AZ) │
    │    └── Amazon ECR ── Docker image registry          │
    │                                                     │
    │  [Monitoring]                                       │
    │    ├── CloudWatch Metrics + Alarms                  │
    │    ├── CloudWatch Log Groups                        │
    │    └── SNS Alert (Email / Slack)                    │
    └─────────────────────────────────────────────────────┘
    │
    ▼
[ReactJS Frontend]  ── Dashboard + Chart.js + Export
```

### 3.2 Các thành phần chi tiết

#### Frontend

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| UI Framework | ReactJS + Vite | Giao diện người dùng |
| Charting | Chart.js | Biểu đồ phân tích |
| HTTP Client | Axios | Gọi REST API |
| Auth | JWT (localStorage) | Quản lý phiên đăng nhập |

#### Backend

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| API Framework | Python FastAPI | REST API server |
| Data processing | Pandas + NumPy | Phân tích dữ liệu CSV |
| Auth | python-jose (JWT) | Xác thực token |
| ORM | SQLAlchemy | Tương tác database |
| PDF Export | ReportLab | Xuất báo cáo PDF |

#### Infrastructure AWS

| Dịch vụ | Vai trò |
|---|---|
| ECS Fargate | Chạy container không cần quản lý server |
| Application Load Balancer | Phân phối traffic, HTTPS termination, health check |
| Amazon ECR | Lưu trữ Docker image |
| Amazon S3 | Lưu file CSV, bật versioning |
| Amazon RDS PostgreSQL | Lưu metadata file, user, lịch sử phân tích |
| CloudWatch | Giám sát metrics, tập trung log |
| SNS | Gửi cảnh báo qua email / Slack |
| VPC | Cô lập mạng, public/private subnet |
| IAM | Phân quyền tối thiểu (least privilege) |

---

## 4. Công nghệ sử dụng

```
Frontend        ReactJS · Vite · Chart.js · Axios
Backend         Python 3.11 · FastAPI · Pandas · NumPy · SQLAlchemy
Database        Amazon RDS PostgreSQL 15 (Multi-AZ)
Storage         Amazon S3 (versioning enabled)
Container       Docker · Amazon ECR · Amazon ECS Fargate
Networking      VPC · ALB · Internet Gateway · Security Groups
CI/CD           GitHub Actions
IaC             Terraform >= 1.6
Monitoring      CloudWatch · SNS
```

---

## 5. Quy trình hoạt động

### Bước 1 — Đăng nhập

```
POST /auth/login
Body: { "email": "user@example.com", "password": "..." }
Response: { "access_token": "eyJ...", "token_type": "bearer" }
```

Frontend lưu JWT vào localStorage và đính kèm vào header `Authorization: Bearer <token>` cho mọi request tiếp theo.

### Bước 2 — Upload file CSV

```
POST /files/upload
Header: Authorization: Bearer <token>
Body: multipart/form-data  (file: sales.csv)
```

Backend thực hiện:
1. Xác thực JWT
2. Kiểm tra định dạng file (chỉ chấp nhận `.csv`)
3. Kiểm tra kích thước file (≤ 100MB)
4. Upload file lên Amazon S3 với path `uploads/{user_id}/{uuid}.csv`
5. Lưu metadata vào RDS

Metadata lưu trong RDS:

```sql
CREATE TABLE files (
    file_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(user_id),
    file_name   VARCHAR(255) NOT NULL,
    s3_path     TEXT NOT NULL,
    upload_time TIMESTAMPTZ DEFAULT NOW(),
    status      VARCHAR(50) DEFAULT 'pending',  -- pending | analyzing | done | failed
    file_size   BIGINT,
    row_count   INTEGER,
    col_count   INTEGER
);
```

### Bước 3 — Phân tích dữ liệu

```
POST /analysis/{file_id}
Header: Authorization: Bearer <token>
```

Backend xử lý:

```python
import pandas as pd
import boto3

# Đọc file từ S3
s3 = boto3.client('s3')
obj = s3.get_object(Bucket=BUCKET_NAME, Key=s3_path)
df = pd.read_csv(obj['Body'])

# Phân tích
result = {
    "rows": len(df),
    "columns": len(df.columns),
    "missing_values": df.isnull().sum().to_dict(),
    "dtypes": df.dtypes.astype(str).to_dict(),
    "describe": df.describe().to_dict(),
    "correlation": df.select_dtypes('number').corr().to_dict()
}
```

### Bước 4 — Trả kết quả

```json
{
  "file_id": "uuid",
  "rows": 1000,
  "columns": 8,
  "missing_values": { "salary": 12, "department": 0 },
  "dtypes": { "salary": "float64", "name": "object" },
  "describe": {
    "salary": { "mean": 12000000, "max": 50000000, "min": 3000000 }
  },
  "charts": {
    "histogram": "s3://bucket/charts/uuid_hist.png",
    "correlation": "s3://bucket/charts/uuid_corr.png"
  }
}
```

### Bước 5 — Dashboard

Frontend nhận JSON và render:
- Bảng thống kê tổng quan
- Bar chart (giá trị theo cột)
- Line chart (xu hướng nếu có cột thời gian)
- Pie chart (phân bổ categorical)
- Nút xuất PDF / CSV

---

## 6. Quy trình DevOps

### 6.1 Branching Strategy

```
main          ── production-ready, chỉ merge từ develop qua PR
develop       ── integration branch, merge từ feature branches
feature/*     ── mỗi tính năng một branch riêng
hotfix/*      ── vá lỗi khẩn cấp thẳng vào main
```

### 6.2 Continuous Integration (CI)

Trigger: mọi push lên `develop` hoặc `feature/*`

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [develop, "feature/*"]
  pull_request:
    branches: [develop, main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run unit tests
        run: pytest --cov=app --cov-report=xml --cov-fail-under=80

      - name: Lint check
        run: flake8 app/ --max-line-length=120

      - name: Build Docker image
        run: |
          docker build -t data-analytics-api:${{ github.sha }} .

      - name: Push to Amazon ECR
        env:
          AWS_REGION: ap-southeast-1
          ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}
        run: |
          aws ecr get-login-password --region $AWS_REGION \
            | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker tag data-analytics-api:${{ github.sha }} \
            $ECR_REGISTRY/data-analytics-api:${{ github.sha }}
          docker push $ECR_REGISTRY/data-analytics-api:${{ github.sha }}
```

### 6.3 Continuous Delivery (CD) — Staging

Trigger: push lên `develop` sau khi CI pass

```yaml
# .github/workflows/cd-staging.yml
deploy-staging:
  needs: ci
  runs-on: ubuntu-latest
  environment: staging
  steps:
    - name: Deploy to ECS Staging
      run: |
        aws ecs update-service \
          --cluster data-analytics-staging \
          --service backend-service \
          --force-new-deployment

    - name: Wait for service stable
      run: |
        aws ecs wait services-stable \
          --cluster data-analytics-staging \
          --services backend-service

    - name: Smoke test
      run: |
        curl -f https://staging.api.example.com/health || exit 1
```

### 6.4 Continuous Delivery (CD) — Production

Trigger: push lên `main` + manual approval

```yaml
# .github/workflows/cd-production.yml
deploy-production:
  needs: deploy-staging
  runs-on: ubuntu-latest
  environment:
    name: production          # environment có require reviewers
    url: https://api.example.com
  steps:
    - name: Deploy to ECS Production (rolling)
      run: |
        aws ecs update-service \
          --cluster data-analytics-prod \
          --service backend-service \
          --force-new-deployment \
          --deployment-configuration \
            "minimumHealthyPercent=100,maximumPercent=200"

    - name: Health check
      run: |
        for i in {1..10}; do
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            https://api.example.com/health)
          [ "$STATUS" = "200" ] && echo "OK" && exit 0
          sleep 15
        done
        exit 1

    - name: Notify success
      run: |
        curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
          -d '{"text": "✅ Deploy production thành công: ${{ github.sha }}"}'
```

### 6.5 Automatic Rollback

```yaml
    - name: Rollback on failure
      if: failure()
      run: |
        # Lấy task definition revision trước đó
        PREV_REVISION=$(aws ecs describe-services \
          --cluster data-analytics-prod \
          --services backend-service \
          --query 'services[0].deployments[1].taskDefinition' \
          --output text)

        aws ecs update-service \
          --cluster data-analytics-prod \
          --service backend-service \
          --task-definition $PREV_REVISION

        # Cảnh báo team
        curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
          -d '{"text": "🔴 Deploy thất bại — đã rollback về revision trước"}'
```

---

## 7. Infrastructure as Code

Toàn bộ hạ tầng được khai báo bằng Terraform, tổ chức theo module:

```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
└── modules/
    ├── networking/       # VPC, Subnets, IGW, Route Tables
    ├── security/         # IAM Roles, Security Groups
    ├── storage/          # S3 Bucket, RDS PostgreSQL
    ├── container/        # ECR, ECS Cluster, ECS Service, Task Definition
    ├── loadbalancer/     # ALB, Target Group, Listener
    └── monitoring/       # CloudWatch, Alarms, SNS, Log Groups
```

### 7.1 Networking module

```hcl
# modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "data-analytics-vpc" }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "public-subnet-${count.index}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = { Name = "private-subnet-${count.index}" }
}
```

### 7.2 ECS Fargate module

```hcl
# modules/container/main.tf
resource "aws_ecs_cluster" "main" {
  name = "data-analytics-${var.environment}"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "data-analytics-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "backend"
    image     = "${aws_ecr_repository.main.repository_url}:latest"
    portMappings = [{ containerPort = 8000, protocol = "tcp" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/data-analytics"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "backend"
      }
    }
    environment = [
      { name = "ENV", value = var.environment },
      { name = "DB_HOST", value = aws_db_instance.postgres.address }
    ]
  }])
}

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-target-tracking"
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
```

### 7.3 RDS PostgreSQL module

```hcl
# modules/storage/rds.tf
resource "aws_db_instance" "postgres" {
  identifier             = "data-analytics-${var.environment}"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_encrypted      = true
  db_name                = "analytics"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az               = var.environment == "production" ? true : false
  skip_final_snapshot    = var.environment != "production"
  backup_retention_period = 7
  deletion_protection    = var.environment == "production" ? true : false
}
```

### 7.4 Triển khai

```bash
# Khởi tạo
terraform init

# Xem trước thay đổi
terraform plan -var-file="env/production.tfvars"

# Áp dụng
terraform apply -var-file="env/production.tfvars" -auto-approve

# Hủy (staging only)
terraform destroy -var-file="env/staging.tfvars"
```

---

## 8. Bảo mật

### 8.1 Authentication

- Người dùng đăng nhập nhận JWT (access token 15 phút + refresh token 7 ngày)
- Mọi API endpoint (trừ `/auth/*` và `/health`) đều yêu cầu `Authorization: Bearer <token>`

### 8.2 IAM Least Privilege

ECS Task Role chỉ được cấp quyền tối thiểu:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::data-analytics-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:ap-southeast-1:*:log-group:/ecs/data-analytics:*"
    }
  ]
}
```

### 8.3 Network Security

| Security Group | Inbound | Source |
|---|---|---|
| ALB SG | 443 (HTTPS) | 0.0.0.0/0 |
| ECS SG | 8000 | ALB SG only |
| RDS SG | 5432 | ECS SG only |

### 8.4 Secrets Management

Biến nhạy cảm (DB password, JWT secret) lưu trong **AWS Secrets Manager**, không hardcode trong code hoặc environment variables.

---

## 9. Monitoring và Logging

### 9.1 CloudWatch Metrics

| Metric | Ngưỡng cảnh báo | Hành động |
|---|---|---|
| ECS CPUUtilization | > 80% trong 5 phút | Scale out + SNS alert |
| ECS MemoryUtilization | > 85% trong 5 phút | SNS alert |
| ALB HTTPCode_Target_5XX_Count | > 10 trong 1 phút | Rollback + SNS alert |
| ALB TargetResponseTime | > 2 giây (p99) | SNS alert |
| RDS FreeStorageSpace | < 2GB | SNS alert |

### 9.2 CloudWatch Log Groups

| Log Group | Nội dung |
|---|---|
| `/ecs/data-analytics/backend` | API request/response, lỗi xử lý |
| `/ecs/data-analytics/auth` | Login, logout, token validation |
| `/ecs/data-analytics/upload` | File upload events |
| `/ecs/data-analytics/analysis` | Job start/complete/fail |
| `/ecs/data-analytics/deploy` | Deployment events |

### 9.3 Health Check

```
GET /health
Response 200:
{
  "status": "healthy",
  "database": "connected",
  "s3": "accessible",
  "version": "1.2.0"
}
```

ALB thực hiện health check mỗi 30 giây. Task bị đánh dấu unhealthy sau 3 lần fail liên tiếp và bị thay thế tự động.

---

## 10. Kịch bản Demo

### Demo 1 — Upload và phân tích dữ liệu

1. Đăng nhập tại `https://app.example.com`
2. Upload file `sales.csv` (1000 dòng, 8 cột)
3. Hệ thống xử lý và hiển thị kết quả:
   - File xuất hiện trong S3 bucket
   - Metadata lưu vào RDS
   - Dashboard hiển thị thống kê và biểu đồ

### Demo 2 — CI/CD Pipeline

```bash
# Sửa code trên feature branch
git checkout -b feature/improve-chart
# ... chỉnh sửa ...
git commit -m "feat: improve chart color scheme"
git push origin feature/improve-chart
```

GitHub Actions tự động:
- Chạy CI (test + lint + build) trong ~3 phút
- Deploy lên staging
- Chờ reviewer approve
- Deploy lên production (rolling, zero-downtime)

### Demo 3 — Auto Scaling

Dùng `hey` hoặc `k6` tạo tải:

```bash
hey -n 10000 -c 100 https://api.example.com/health
```

CloudWatch metrics tăng → ECS Auto Scaling scale out từ 1 lên 3 tasks.

### Demo 4 — Rollback

```bash
# Deploy phiên bản lỗi
git tag v2.0.0-broken
git push origin v2.0.0-broken

# GitHub Actions phát hiện health check fail
# Tự động rollback về task definition trước đó
# SNS gửi alert đến Slack
```

Kết quả: hệ thống quay về phiên bản ổn định trong < 2 phút.

### Demo 5 — Monitoring Dashboard

Mở CloudWatch → Dashboard `data-analytics-overview`:
- CPU / Memory của ECS tasks theo thời gian thực
- Số request/giây qua ALB
- Error rate (5xx / 4xx)
- Response time p50 / p99
- Log stream từ `/ecs/data-analytics/backend`

---

## 11. Lợi ích đạt được

| Lợi ích | Mô tả |
|---|---|
| Tự động hóa hoàn toàn | Từ commit đến production không cần thao tác thủ công |
| Zero-downtime deploy | Rolling deployment qua ECS + ALB |
| Auto Scaling | Tự động tăng/giảm số task theo tải |
| Rollback tự động | Phát hiện lỗi và phục hồi < 2 phút |
| Hạ tầng dưới dạng code | Terraform đảm bảo môi trường nhất quán |
| Quan sát toàn diện | CloudWatch metrics + logs + alarms tập trung |
| Bảo mật theo lớp | JWT + IAM least privilege + Security Groups + VPC isolation |
| Chi phí tối ưu | Fargate chỉ tính phí khi task đang chạy |

---

## 12. Kết luận

Hệ thống Data Analytics API trên AWS kết hợp các công nghệ DevOps hiện đại:

- **Docker + ECR + ECS Fargate** — container hóa và chạy ứng dụng không cần quản lý server
- **GitHub Actions** — CI/CD pipeline tự động với staging gate và manual approval
- **Terraform** — toàn bộ hạ tầng được khai báo dưới dạng code, dễ tái tạo và kiểm soát phiên bản
- **ALB + Auto Scaling** — đảm bảo tính sẵn sàng cao và khả năng mở rộng
- **CloudWatch + SNS** — giám sát chủ động và cảnh báo tức thời
- **RDS Multi-AZ + S3 Versioning** — dữ liệu được bảo vệ và có thể khôi phục

Kết quả là một nền tảng phân tích dữ liệu có khả năng mở rộng, tự động triển khai, dễ giám sát và phù hợp với các thực hành phát triển phần mềm hiện đại trên AWS.

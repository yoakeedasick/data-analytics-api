# Dalytics — Data Analytics API

**Nền tảng phân tích dữ liệu CSV trên AWS với quy trình DevOps CI/CD**

`Python 3.11` · `FastAPI` · `React 19` · `Vite` · `PostgreSQL 15` · `AWS ECS Fargate` · `Terraform` · `GitHub Actions`

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Chức năng](#chức-năng)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt và chạy Local](#cài-đặt-và-chạy-local)
- [Biến môi trường](#biến-môi-trường)
- [API Endpoints](#api-endpoints)
- [Quy trình hoạt động](#quy-trình-hoạt-động)
- [Frontend](#frontend)
- [Testing](#testing)
- [Docker](#docker)
- [CI/CD Pipeline](#cicd-pipeline)
- [Triển khai và hủy hệ thống trên AWS](#triển-khai-và-hủy-hệ-thống-trên-aws)
- [Infrastructure as Code (Terraform)](#infrastructure-as-code-terraform)
- [Bảo mật](#bảo-mật)
- [Monitoring và Logging](#monitoring-và-logging)
- [AWS SES — Gửi Email OTP](#aws-ses--gửi-email-otp)
- [Dữ liệu mẫu](#dữ-liệu-mẫu)
- [Lợi ích đạt được](#lợi-ích-đạt-được)

---

## Tổng quan

**Dalytics** là hệ thống phân tích dữ liệu CSV trên nền tảng AWS, cho phép người dùng tải lên file CSV, thực hiện phân tích thống kê tự động và xem kết quả trực quan thông qua dashboard web. Hệ thống được xây dựng theo mô hình DevOps hiện đại với pipeline CI/CD hoàn chỉnh.

### Mục tiêu

- Container hóa ứng dụng bằng **Docker**
- Quản lý hạ tầng bằng **Terraform** (Infrastructure as Code)
- Tích hợp và triển khai liên tục (CI/CD) bằng **GitHub Actions**
- Giám sát hệ thống bằng **Amazon CloudWatch**
- Lưu trữ dữ liệu trên **Amazon S3**
- Gửi email xác thực qua **Amazon SES**
- Triển khai ứng dụng trên **AWS ECS Fargate** với Auto Scaling

### Phạm vi

| Thành phần        | Giá trị                      |
| ----------------- | ---------------------------- |
| AWS Region        | `ap-southeast-1` (Singapore) |
| Môi trường        | Staging + Production         |
| Giao thức         | HTTPS (qua ALB)              |
| Authentication    | JWT (Access + Refresh Token) |
| Email Service     | AWS SES (OTP verification)   |
| Container Runtime | AWS ECS Fargate              |

---

## Chức năng

### Chức năng người dùng

- Đăng ký tài khoản mới (xác thực qua mã OTP 6 số gửi từ AWS SES)
- Đăng nhập bảo mật (JWT Access Token 15 phút + Refresh Token 7 ngày, tự động làm mới ngầm)
- Quên mật khẩu & đặt lại mật khẩu mới thông qua xác thực mã OTP gửi về email
- Upload file CSV (tối đa 100 MB)
- Xem lịch sử các file đã upload
- Thực hiện phân tích dữ liệu tự động
- Xem dashboard kết quả phân tích (biểu đồ tương tác)
- Xuất báo cáo dưới dạng PDF
- Quản lý hồ sơ cá nhân (đổi tên, đổi mật khẩu khi đã đăng nhập)

### Kết quả phân tích tự động

Sau khi upload file CSV, hệ thống phân tích và trả về:

| Chỉ số          | Mô tả                                   |
| ---------------- | ---------------------------------------- |
| Rows / Columns   | Số lượng dòng và cột                     |
| Column Names     | Tên các cột trong dữ liệu               |
| Data Types       | Kiểu dữ liệu của từng cột               |
| Missing Values   | Số lượng và tỷ lệ (%) giá trị thiếu     |
| Describe         | Thống kê mô tả (mean, std, min, max, …) |
| Correlation      | Ma trận tương quan giữa các cột số       |

### Trực quan hóa (Dashboard)

- **Bar chart** — so sánh giá trị theo nhóm
- **Line chart** — xu hướng theo thời gian
- **Pie chart** — phân bổ tỷ lệ categorical
- **Heatmap** — ma trận tương quan

---

## Kiến trúc hệ thống

```
[Developer]
    │
    ▼
[GitHub Repository]  ── feature/develop/main branches
    │
    ▼
[GitHub Actions]  ── CI/CD Pipeline
    │
    ├── CI: checkout → install → pytest → flake8 → docker build → push ECR
    │
    └── CD: staging deploy → smoke test → approval → prod deploy (rolling)
              │
              ▼
         [Amazon ECR]  ── Docker Image Registry
              │
              ▼
    ┌─────── AWS VPC (ap-southeast-1) ────────────────────┐
    │                                                     │
    │  [Public Subnet]                                    │
    │    └── Application Load Balancer (HTTPS)            │
    │          └── Internet Gateway                       │
    │                                                     │
    │  [Private Subnet]                                   │
    │    ├── ECS Fargate Cluster                          │
    │    │     ├── FastAPI Backend (task)                  │
    │    │     ├── Auto Scaling (CPU/Memory)               │
    │    │     └── IAM Task Role                          │
    │    │                                                │
    │    ├── Amazon S3  ── CSV files + versioning         │
    │    ├── Amazon RDS PostgreSQL ── metadata (Multi-AZ) │
    │    └── Amazon ECR ── Docker image registry          │
    │                                                     │
    │  [Email]                                            │
    │    └── Amazon SES ── OTP verification emails        │
    │                                                     │
    │  [Monitoring]                                       │
    │    ├── CloudWatch Metrics + Alarms                  │
    │    ├── CloudWatch Log Groups                        │
    │    └── SNS Alert (Email / Slack)                    │
    └─────────────────────────────────────────────────────┘
         │
         ▼
[ReactJS Frontend]  ── Dashboard + Chart.js + Export PDF
```

---

## Công nghệ sử dụng

| Lớp              | Công nghệ                                                       |
| ---------------- | ---------------------------------------------------------------- |
| **Frontend**     | React 19 · Vite 5 · Chart.js · Axios · React Router 7 · Zustand |
| **Backend**      | Python 3.11 · FastAPI · Pandas · NumPy · SQLAlchemy · ReportLab  |
| **Database**     | Amazon RDS PostgreSQL 15 (Multi-AZ) · Alembic (migrations)      |
| **Storage**      | Amazon S3 (versioning enabled)                                   |
| **Email**        | Amazon SES (OTP verification + password reset)                   |
| **Container**    | Docker (multi-stage build) · Amazon ECR · Amazon ECS Fargate     |
| **Networking**   | VPC · ALB · Internet Gateway · Security Groups                   |
| **CI/CD**        | GitHub Actions (3 workflows: CI, CD Staging, CD Production)      |
| **IaC**          | Terraform >= 1.6 (6 modules)                                    |
| **Monitoring**   | CloudWatch · SNS                                                 |
| **Auth**         | JWT (python-jose) · Passlib + bcrypt · OTP 6 số (AWS SES)       |

---

## Cấu trúc dự án

```
DataAnalyticsAPI/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # CI: test, lint, docker build, push ECR
│       ├── cd-staging.yml          # CD: deploy to ECS Staging
│       └── cd-production.yml       # CD: deploy to ECS Production + rollback
│
├── app/                            # ── FastAPI Backend ──────────────────
│   ├── __init__.py
│   ├── main.py                     # FastAPI app entry point, CORS, routers
│   ├── config.py                   # Pydantic settings (env vars + sender_email)
│   ├── database.py                 # SQLAlchemy engine, session, Base
│   ├── middleware/
│   │   └── auth_middleware.py      # JWT Bearer token validation
│   ├── models/
│   │   ├── user.py                 # User model (UUID, email, OTP, is_verified)
│   │   └── file.py                 # File + AnalysisResult models
│   ├── schemas/
│   │   ├── auth.py                 # Auth schemas (register, OTP, forgot/reset password)
│   │   ├── file.py                 # File upload/list schemas
│   │   └── analysis.py             # Analysis result schemas
│   ├── routers/
│   │   ├── auth.py                 # /auth/* (register, login, OTP, forgot/reset password)
│   │   ├── files.py                # /files/* endpoints
│   │   ├── analysis.py             # /analysis/* endpoints + PDF export
│   │   └── health.py               # /health endpoint
│   └── services/
│       ├── auth_service.py         # JWT create/decode, password hashing
│       ├── email_service.py        # AWS SES: gửi OTP đăng ký + reset password
│       ├── s3_service.py           # S3 upload/download/delete/check
│       ├── analysis_service.py     # Pandas CSV analysis logic
│       └── pdf_service.py          # ReportLab PDF report generation
│
├── frontend/                       # ── React Frontend ──────────────────
│   ├── src/
│   │   ├── App.jsx                 # Routes + ProtectedRoute/PublicRoute
│   │   ├── main.jsx                # React DOM entry
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Auth state management
│   │   ├── pages/
│   │   │   ├── Landing.jsx/.css    # Landing page (public)
│   │   │   ├── Login.jsx/.css      # Login + Register forms
│   │   │   ├── VerifyOTP.jsx/.css  # Xác thực mã OTP đăng ký
│   │   │   ├── ForgotPassword.jsx/.css  # Yêu cầu OTP đặt lại mật khẩu
│   │   │   ├── ResetPassword.jsx/.css   # Nhập OTP + mật khẩu mới
│   │   │   ├── Dashboard.jsx/.css  # Overview dashboard
│   │   │   ├── Upload.jsx/.css     # CSV file upload
│   │   │   ├── Files.jsx/.css      # File history list
│   │   │   ├── Analysis.jsx/.css   # Analysis results + charts
│   │   │   └── Settings.jsx/.css   # User profile settings
│   │   ├── services/
│   │   │   └── api.js              # Axios instance + interceptors (token refresh)
│   │   ├── styles/
│   │   │   └── index.css           # Global styles + design tokens
│   │   └── components/
│   │       └── layout/             # Shared layout components
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── terraform/                      # ── Infrastructure as Code ──────────
│   ├── main.tf                     # Root module: wires all sub-modules
│   ├── variables.tf                # Input variables
│   ├── outputs.tf                  # Output values (ALB DNS, ECR URL, …)
│   ├── env/
│   │   ├── staging.tfvars          # Biến cho môi trường staging
│   │   └── production.tfvars       # Biến cho môi trường production
│   └── modules/
│       ├── networking/             # VPC, Subnets, IGW, Route Tables
│       ├── security/               # IAM Roles, Security Groups
│       ├── storage/                # S3 Bucket, RDS PostgreSQL
│       ├── container/              # ECR, ECS Cluster, Service, Task Def, Auto Scaling
│       ├── loadbalancer/           # ALB, Target Group, Listener
│       └── monitoring/             # CloudWatch Alarms, Log Groups, SNS
│
├── alembic/                        # Database migration scripts
│   ├── env.py
│   └── versions/
│
├── tests/                          # ── Unit Tests ──────────────────────
│   ├── conftest.py                 # Pytest fixtures (test DB, client)
│   ├── test_auth.py                # Auth: register, OTP, login, forgot/reset password
│   ├── test_analysis.py            # Analysis endpoint tests
│   └── test_pdf_export.py          # PDF export tests
│
├── data-test/                      # Sample CSV/XLSX for testing
├── Dockerfile                      # Multi-stage Docker build
├── docker-compose.yml              # Local dev: PostgreSQL + Backend
├── requirements.txt                # Python dependencies
├── alembic.ini                     # Alembic configuration
├── .env.example                    # Environment variable template
├── deloy-destroy.md                # Hướng dẫn triển khai & hủy hệ thống AWS
├── data-analytics-system.md        # Tài liệu kiến trúc hệ thống chi tiết
└── .gitignore
```

---

## Yêu cầu hệ thống

### Phát triển Local

| Phần mềm       | Phiên bản tối thiểu |
| --------------- | -------------------- |
| Python          | 3.11                 |
| Node.js         | 18+                  |
| Docker Desktop  | 24+                  |
| Docker Compose  | 2.0+                 |
| Git             | 2.30+                |

### Triển khai AWS

| Công cụ / Tài khoản | Phiên bản / Yêu cầu |
| -------------------- | -------------------- |
| AWS Account          | IAM credentials      |
| AWS CLI              | 2.x (đã `aws configure`) |
| Terraform            | >= 1.6               |

---

## Cài đặt và chạy Local

### 1. Clone repository

```bash
git clone https://github.com/your-org/DataAnalyticsAPI.git
cd DataAnalyticsAPI
```

### 2. Cấu hình biến môi trường

```bash
cp .env.example .env
# Chỉnh sửa .env theo cấu hình local
```

### 3A. Chạy bằng Docker Compose (khuyến nghị)

```bash
# Khởi chạy PostgreSQL + Backend
docker-compose up -d

# Backend sẽ chạy tại http://localhost:8000
# API Docs tại http://localhost:8000/docs
```

### 3B. Chạy Backend thủ công (không Docker)

```bash
# Cài dependencies
pip install -r requirements.txt

# Chạy migration
alembic upgrade head

# Khởi chạy server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Chạy Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Khởi chạy dev server
npm run dev

# Frontend sẽ chạy tại http://localhost:5173
```

### 5. Build Frontend cho Production

```bash
cd frontend
npm run build    # Output: frontend/dist/
npm run preview  # Preview bản build tại http://localhost:4173
```

---

## Biến môi trường

Tạo file `.env` tại thư mục gốc dự án (tham khảo `.env.example`):

```env
# ── Application ─────────────────────────────────────────
APP_ENV=development                          # development | staging | production
SECRET_KEY=your-super-secret-key             # JWT signing key
ALGORITHM=HS256                              # JWT algorithm
ACCESS_TOKEN_EXPIRE_MINUTES=15               # Access token TTL
REFRESH_TOKEN_EXPIRE_DAYS=7                  # Refresh token TTL

# ── Database ────────────────────────────────────────────
DATABASE_URL=postgresql://analytics_user:analytics_pass@localhost:5432/analytics

# ── AWS ─────────────────────────────────────────────────
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-southeast-1
S3_BUCKET_NAME=data-analytics-bucket
SENDER_EMAIL=your-verified-ses-email@example.com  # Email gửi OTP (phải xác minh trên AWS SES)

# ── CORS ────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173,http://localhost:3000
```

Frontend sử dụng file `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

---

## API Endpoints

Base URL: `http://localhost:8000` · Interactive docs: `/docs` · ReDoc: `/redoc`

### Health Check

| Method | Endpoint  | Auth | Mô tả                        |
| ------ | --------- | ---- | ----------------------------- |
| `GET`  | `/health` | Không | Kiểm tra DB + S3 connectivity |

**Response:**

```json
{
  "status": "healthy",
  "database": "connected",
  "s3": "accessible",
  "version": "1.0.0"
}
```

### Authentication (`/auth`)

| Method | Endpoint                | Auth  | Mô tả                                     |
| ------ | ----------------------- | ----- | ------------------------------------------ |
| `POST` | `/auth/register`        | Không | Đăng ký tài khoản mới (gửi mã OTP qua SES) |
| `POST` | `/auth/verify-otp`      | Không | Xác thực tài khoản bằng mã OTP 6 số        |
| `POST` | `/auth/resend-otp`      | Không | Gửi lại mã OTP xác thực đăng ký            |
| `POST` | `/auth/login`           | Không | Đăng nhập, nhận JWT tokens                  |
| `POST` | `/auth/refresh`         | Không | Làm mới access token bằng refresh token     |
| `POST` | `/auth/forgot-password` | Không | Yêu cầu gửi mã OTP đặt lại mật khẩu       |
| `POST` | `/auth/reset-password`  | Không | Đặt lại mật khẩu mới bằng mã OTP           |
| `GET`  | `/auth/me`              | Có   | Xem thông tin user hiện tại                 |
| `PUT`  | `/auth/profile`         | Có   | Cập nhật họ tên                             |
| `PUT`  | `/auth/password`        | Có   | Đổi mật khẩu (cần nhập mật khẩu hiện tại)  |

**Luồng đăng ký:**

```
POST /auth/register  →  Nhận mã OTP qua email
POST /auth/verify-otp  →  Xác thực email thành công
POST /auth/login  →  Nhận JWT tokens
```

**Đăng nhập:**

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your_password"}'
```

**Response:**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Luồng quên mật khẩu:**

```
POST /auth/forgot-password  →  Nhận mã OTP qua email
POST /auth/reset-password   →  Nhập OTP + mật khẩu mới → Đặt lại thành công
```

### Files (`/files`)

| Method   | Endpoint           | Auth | Mô tả                                    |
| -------- | ------------------ | ---- | ----------------------------------------- |
| `POST`   | `/files/upload`    | Có   | Upload file CSV (multipart, max 100MB)    |
| `GET`    | `/files`           | Có   | Danh sách files (phân trang: skip, limit) |
| `GET`    | `/files/{file_id}` | Có   | Chi tiết metadata một file                |
| `DELETE` | `/files/{file_id}` | Có   | Xóa file khỏi S3 + DB                    |

**Upload file:**

```bash
curl -X POST http://localhost:8000/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@sales.csv"
```

### Analysis (`/analysis`)

| Method | Endpoint                     | Auth | Mô tả                  |
| ------ | ---------------------------- | ---- | ----------------------- |
| `POST` | `/analysis/{file_id}`        | Có   | Chạy phân tích (Pandas) |
| `GET`  | `/analysis/{file_id}`        | Có   | Xem kết quả phân tích   |
| `GET`  | `/analysis/{file_id}/export` | Có   | Xuất báo cáo PDF        |

**Chạy phân tích:**

```bash
curl -X POST http://localhost:8000/analysis/<file_id> \
  -H "Authorization: Bearer <token>"
```

**Response mẫu:**

```json
{
  "file_id": "uuid",
  "status": "done",
  "file_name": "sales.csv",
  "rows": 1000,
  "columns": 8,
  "column_names": ["id", "name", "salary", "department"],
  "dtypes": { "salary": "float64", "name": "object" },
  "missing_values": { "salary": 12, "department": 0 },
  "missing_pct": { "salary": 1.2, "department": 0.0 },
  "describe": {
    "salary": { "mean": 12000000, "std": 5000000, "min": 3000000, "max": 50000000 }
  },
  "correlation": { "salary": { "salary": 1.0, "age": 0.65 } }
}
```

---

## Quy trình hoạt động

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Đăng ký │────▶│ Xác thực │────▶│  Upload  │────▶│  Phân    │────▶│  Xem     │────▶│  Xuất   │
│ (Email)  │     │  OTP     │     │  CSV     │     │  tích    │     │ Dashboard│     │  PDF    │
│          │     │ (SES)    │     │ (S3)     │     │ (Pandas) │     │(Chart.js)│     │(Report) │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

1. **Đăng ký** → `POST /auth/register` → hệ thống gửi mã OTP 6 số qua AWS SES
2. **Xác thực OTP** → `POST /auth/verify-otp` → tài khoản được kích hoạt
3. **Đăng nhập** → `POST /auth/login` → nhận JWT → lưu vào localStorage
4. **Upload CSV** → `POST /files/upload` → validate → upload S3 → lưu metadata vào RDS
5. **Phân tích** → `POST /analysis/{file_id}` → download từ S3 → Pandas analyze → lưu result JSON vào DB
6. **Dashboard** → `GET /analysis/{file_id}` → frontend render Chart.js
7. **Export** → `GET /analysis/{file_id}/export` → ReportLab tạo PDF → download

---

## Frontend

### Trang / Routes

| Route              | Component        | Auth  | Mô tả                                    |
| ------------------ | ---------------- | ----- | ----------------------------------------- |
| `/`                | `Landing`        | Không | Trang chủ giới thiệu                     |
| `/login`           | `Login`          | Không | Đăng nhập                                |
| `/register`        | `Login`          | Không | Đăng ký                                  |
| `/verify-otp`      | `VerifyOTP`      | Không | Xác thực mã OTP đăng ký                  |
| `/forgot-password` | `ForgotPassword` | Không | Yêu cầu gửi mã OTP đặt lại mật khẩu     |
| `/reset-password`  | `ResetPassword`  | Không | Nhập mã OTP + mật khẩu mới               |
| `/dashboard`       | `Dashboard`      | Có    | Tổng quan thống kê                        |
| `/upload`          | `Upload`         | Có    | Upload file CSV                           |
| `/files`           | `Files`          | Có    | Lịch sử file đã upload                   |
| `/analytics`       | `Analysis`       | Có    | Chọn file để xem phân tích               |
| `/analysis/:id`    | `Analysis`       | Có    | Kết quả phân tích chi tiết               |
| `/settings`        | `Settings`       | Có    | Cài đặt hồ sơ cá nhân                    |

### Công nghệ Frontend

- **React 19** + **Vite 5** — build tool nhanh với HMR
- **React Router 7** — client-side routing + route guards (ProtectedRoute / PublicRoute)
- **Chart.js** + **react-chartjs-2** — biểu đồ phân tích tương tác
- **Axios** — HTTP client với interceptors tự động refresh token khi nhận 401
- **Zustand** — state management nhẹ
- **AuthContext** — quản lý trạng thái đăng nhập

---

## Testing

### Chạy Unit Tests

```bash
# Chạy toàn bộ tests với coverage report
pytest tests/ \
  --cov=app \
  --cov-report=term-missing \
  --cov-fail-under=75 \
  -v
```

### Bộ test hiện có

| File                       | Nội dung test                                                             |
| -------------------------- | ------------------------------------------------------------------------- |
| `tests/conftest.py`        | Fixtures: test database (SQLite), test client                             |
| `tests/test_auth.py`       | Đăng ký, OTP xác thực, đăng nhập, quên/đặt lại mật khẩu, refresh, profile |
| `tests/test_analysis.py`   | Xử lý phân tích tệp CSV (Pandas, NumPy)                                  |
| `tests/test_pdf_export.py` | Xuất báo cáo kết quả PDF (ReportLab)                                     |

### Lint

```bash
flake8 app/ tests/ --max-line-length=120 --extend-ignore=E501
```

---

## Docker

### Multi-stage Dockerfile

```dockerfile
# Stage 1: Build — cài đặt Python dependencies
FROM python:3.11-slim AS builder

# Stage 2: Runtime — chỉ copy packages đã cài + source code
FROM python:3.11-slim
# Chạy: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Docker Compose (phát triển Local)

```bash
# Khởi chạy PostgreSQL 15 + FastAPI Backend (với hot-reload)
docker-compose up -d

# Dừng services
docker-compose down

# Dừng + xóa data
docker-compose down -v
```

**Services:**

| Service    | Port | Mô tả                                |
| ---------- | ---- | ------------------------------------- |
| `postgres` | 5432 | PostgreSQL 15 Alpine + healthcheck    |
| `backend`  | 8000 | FastAPI + auto migration + hot-reload |

---

## CI/CD Pipeline

### Branching Strategy

```
main          ── production-ready, chỉ merge từ develop qua PR
develop       ── integration branch, merge từ feature branches
feature/*     ── mỗi tính năng một branch riêng
hotfix/*      ── vá lỗi khẩn cấp thẳng vào main
```

### Pipeline Overview

```
 feature/* push              develop push              main push
      │                           │                         │
      ▼                           ▼                         ▼
 ┌─────────┐               ┌─────────┐              ┌──────────┐
 │   CI    │               │   CI    │              │    CI     │
 │  pytest │               │  pytest │              │   pytest  │
 │  flake8 │               │  flake8 │              │   flake8  │
 │  docker │               │  docker │              │   docker  │
 │  build  │               │  build  │              │   build   │
 └─────────┘               └────┬────┘              └─────┬────┘
                                │                         │
                                ▼                         ▼
                         ┌────────────┐          ┌───────────────┐
                         │  CD Staging│          │ CD Production │
                         │  ECS deploy│          │ Manual Approve│
                         │ Smoke test │          │  ECS deploy   │
                         │ Slack notif│          │ Health check  │
                         └────────────┘          │  Auto rollback│
                                                 │ Slack notif   │
                                                 └───────────────┘
```

### Workflow 1 — CI (`ci.yml`)

**Trigger:** push lên `develop`, `feature/*` hoặc PR vào `develop`, `main`

1. Checkout source
2. Setup Python 3.11 + cache pip
3. Install dependencies
4. **Unit tests** — pytest với coverage >= 75%
5. **Lint** — flake8
6. **Docker build** + push lên Amazon ECR (tag: `${{ github.sha }}` + `latest`)

### Workflow 2 — CD Staging (`cd-staging.yml`)

**Trigger:** push lên `develop`

1. Configure AWS credentials
2. Download current ECS task definition
3. Render new image ID vào task definition
4. Deploy to ECS Staging (rolling, wait for stability)
5. **Smoke test** — health check (retry 10 lần, interval 15s)
6. Slack notification (success / failure)

### Workflow 3 — CD Production (`cd-production.yml`)

**Trigger:** push lên `main` + **manual reviewer approval**

1. Save previous task definition revision (cho rollback)
2. Deploy to ECS Production (rolling, zero-downtime)
3. Health check production
4. **Tự động rollback** nếu health check fail → restore task definition trước đó
5. Slack notification

### GitHub Secrets cần cấu hình

| Secret                  | Mô tả                              |
| ----------------------- | ----------------------------------- |
| `AWS_ACCESS_KEY_ID`     | AWS IAM Access Key                  |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM Secret Key                  |
| `STAGING_API_URL`       | URL staging API (ALB DNS)           |
| `PROD_API_URL`          | URL production API                  |
| `STAGING_DB_HOST`       | Endpoint của RDS Database (nếu cần) |
| `SLACK_WEBHOOK`         | Slack webhook URL                   |

---

## Triển khai và hủy hệ thống trên AWS

> Xem chi tiết đầy đủ tại file `deloy-destroy.md`

### Triển khai (Deploy) — 6 bước

**Bước 1:** Khởi tạo Terraform

```bash
cd terraform
terraform init
```

**Bước 2:** Kiểm tra cấu hình trong `terraform/env/staging.tfvars`

**Bước 3:** Tạo tài nguyên trên AWS (~5-7 phút, ~52 tài nguyên)

```bash
terraform apply -var-file="env/staging.tfvars" -auto-approve
```

Sau khi hoàn thành, lưu lại giá trị **`alb_dns_name`** từ Outputs.

**Bước 4:** Cập nhật `frontend/.env` với `VITE_API_URL` = địa chỉ ALB

**Bước 5:** Cấu hình GitHub Secrets (AWS credentials, STAGING_API_URL, …)

**Bước 6:** Push code lên nhánh `develop` để kích hoạt CI/CD

```bash
git add .
git commit -m "deploy: update staging api url"
git push origin develop
```

### Hủy (Destroy) — tránh phát sinh chi phí

```bash
cd terraform
terraform destroy -var-file="env/staging.tfvars" -auto-approve
```

Thời gian: ~3-5 phút. Sau đó kiểm tra thủ công trên AWS Console (RDS, ECS, EC2 Load Balancers) để đảm bảo đã xóa sạch.

---

## Infrastructure as Code (Terraform)

Toàn bộ hạ tầng AWS được khai báo bằng Terraform, tổ chức theo 6 module:

```
terraform/
├── main.tf             # Root: kết nối tất cả modules
├── variables.tf        # Input variables (region, env, credentials)
├── outputs.tf          # Output: ALB DNS, ECR URL, ECS cluster, RDS endpoint, S3 bucket
├── env/
│   ├── staging.tfvars      # Biến cho staging
│   └── production.tfvars   # Biến cho production
└── modules/
    ├── networking/      # VPC (10.0.0.0/16), 2 Public + 2 Private Subnets, IGW, Route Tables
    ├── security/        # IAM Roles (ECS execution + task), Security Groups (ALB, ECS, RDS)
    ├── storage/         # S3 Bucket (versioning), RDS PostgreSQL 15 (Multi-AZ for prod)
    ├── container/       # ECR repo, ECS Cluster, Task Definition, ECS Service, Auto Scaling
    ├── loadbalancer/    # ALB, Target Group, Listener (HTTPS)
    └── monitoring/      # CloudWatch Alarms, Log Groups, SNS Topic
```

### Terraform Variables

| Variable         | Mô tả                                | Sensitive |
| ---------------- | ------------------------------------- | --------- |
| `aws_region`     | AWS Region (default: ap-southeast-1)  | Không     |
| `environment`    | `staging` hoặc `production`           | Không     |
| `vpc_cidr`       | CIDR block (default: 10.0.0.0/16)     | Không     |
| `ecr_repo_name`  | Tên ECR repository                    | Không     |
| `s3_bucket_name` | Tên S3 bucket                         | Không     |
| `db_username`    | RDS PostgreSQL username               | Có        |
| `db_password`    | RDS PostgreSQL password               | Có        |
| `secret_key`     | JWT secret key                        | Có        |
| `sns_alert_email`| Email nhận CloudWatch alerts          | Không     |

### Lệnh Terraform

```bash
cd terraform

# Khởi tạo
terraform init

# Xem trước thay đổi
terraform plan -var-file="env/staging.tfvars"

# Áp dụng
terraform apply -var-file="env/staging.tfvars" -auto-approve

# Xem outputs
terraform output

# Hủy
terraform destroy -var-file="env/staging.tfvars" -auto-approve
```

### ECS Auto Scaling

- **Min tasks:** 1
- **Max tasks:** 10
- **Target tracking:** CPU Utilization 70%
- Tự động scale out/in dựa trên CPU load

---

## Bảo mật

### Authentication

- JWT Access Token (15 phút) + Refresh Token (7 ngày)
- Đăng ký tài khoản yêu cầu xác thực email qua mã OTP 6 số (hết hạn sau 5 phút)
- Mọi API endpoint (trừ `/auth/*` và `/health`) yêu cầu `Authorization: Bearer <token>`
- Password hashing: **bcrypt** (Passlib)
- Frontend tự động refresh token khi nhận 401 (Axios interceptors)

### IAM Least Privilege

ECS Task Role chỉ được cấp quyền tối thiểu:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::data-analytics-bucket/*"
}
```

### Network Security

| Security Group | Inbound     | Source      |
| -------------- | ----------- | ----------- |
| ALB SG         | 443 (HTTPS) | 0.0.0.0/0  |
| ECS SG         | 8000        | ALB SG only |
| RDS SG         | 5432        | ECS SG only |

### Secrets Management

Biến nhạy cảm (DB password, JWT secret) được lưu trong **AWS Secrets Manager**, không hardcode trong code hoặc environment variables.

---

## Monitoring và Logging

### CloudWatch Alarms

| Metric                        | Ngưỡng cảnh báo    | Hành động             |
| ----------------------------- | ------------------- | --------------------- |
| ECS CPUUtilization            | > 80% trong 5 phút  | Scale out + SNS alert |
| ECS MemoryUtilization         | > 85% trong 5 phút  | SNS alert             |
| ALB HTTPCode_Target_5XX_Count | > 10 trong 1 phút   | Rollback + SNS alert  |
| ALB TargetResponseTime        | > 2 giây (p99)       | SNS alert             |
| RDS FreeStorageSpace          | < 2 GB              | SNS alert             |

### CloudWatch Log Groups

| Log Group                      | Nội dung                                           |
| ------------------------------ | -------------------------------------------------- |
| `/ecs/data-analytics/backend` | Log ứng dụng FastAPI (request, auth, S3, analysis) |

### Health Check

- **Endpoint:** `GET /health`
- ALB health check: mỗi **30 giây**
- Task bị đánh dấu **unhealthy** sau **3 lần fail liên tiếp** → tự động thay thế

---

## AWS SES — Gửi Email OTP

Hệ thống sử dụng **Amazon Simple Email Service (SES)** để gửi mã OTP cho:
- Xác thực email khi đăng ký tài khoản mới
- Đặt lại mật khẩu (forgot password)

### Cấu hình SES

1. Biến `SENDER_EMAIL` trong `.env` phải là email đã được **xác minh (verified)** trên AWS SES
2. Mã OTP gồm **6 chữ số**, hết hạn sau **5 phút**

### Lưu ý quan trọng — SES Sandbox Mode

Tài khoản AWS SES mặc định nằm trong chế độ **Sandbox**:

| Vai trò         | Sandbox (mặc định)                             | Production                                |
| --------------- | ---------------------------------------------- | ----------------------------------------- |
| Email gửi       | Phải được xác minh trên SES                    | Phải được xác minh trên SES               |
| Email nhận      | Cũng phải được xác minh thủ công trên SES      | Gửi cho bất kỳ ai                         |
| Cách nâng cấp   | —                                              | Tạo yêu cầu **Sandbox Removal** trên AWS  |

**Xác minh email nhận trong Sandbox:**

1. Vào **AWS Console > SES > Verified Identities**
2. Nhấn **Create Identity** > nhập email nhận
3. Bấm link xác nhận được gửi vào hòm thư đó

**Nâng cấp lên Production:**

Tạo yêu cầu hỗ trợ **Service Limit Increase** trên dịch vụ **Service Quotas** của AWS (khu vực `ap-southeast-1`). Thường được duyệt trong vòng 24 giờ.

---

## Dữ liệu mẫu

Thư mục `data-test/` chứa các file CSV/XLSX mẫu để kiểm thử:

| File                              | Kích thước | Mô tả                        |
| --------------------------------- | ---------- | ----------------------------- |
| `Amazon_Sale_Report.csv`          | ~66 MB     | Báo cáo bán hàng Amazon      |
| `continuous_dataset.csv`          | ~10 MB     | Dataset liên tục              |
| `daily-minimum-temperatures.csv`  | ~66 KB     | Nhiệt độ tối thiểu hàng ngày |
| `social_media.csv`                | ~500 KB    | Dữ liệu mạng xã hội         |
| `gossipcop_fake.csv`              | ~12 MB     | Tin giả (GossipCop)          |
| `gossipcop_real.csv`              | ~19 MB     | Tin thật (GossipCop)         |
| `politifact_fake.csv`             | ~3 MB      | Tin giả (PolitiFact)         |
| `politifact_real.csv`             | ~8 MB      | Tin thật (PolitiFact)        |

---

## Lợi ích đạt được

| Lợi ích                 | Mô tả                                                      |
| ----------------------- | ----------------------------------------------------------- |
| Tự động hóa hoàn toàn   | Từ commit đến production không cần thao tác thủ công        |
| Zero-downtime deploy    | Rolling deployment qua ECS + ALB                            |
| Auto Scaling            | Tự động tăng/giảm số task theo tải (1 → 10)                |
| Rollback tự động        | Phát hiện lỗi và phục hồi < 2 phút                         |
| Hạ tầng dưới dạng code  | Terraform đảm bảo môi trường nhất quán, có version control  |
| Quan sát toàn diện      | CloudWatch metrics + logs + alarms tập trung                |
| Bảo mật theo lớp        | JWT + OTP + IAM least privilege + SG + VPC isolation        |
| Chi phí tối ưu          | Fargate chỉ tính phí khi task đang chạy                     |

---

## License

Dự án này được phát triển cho mục đích học tập và demo — môn Điện Toán Đám Mây.

**Dalytics** — Built with FastAPI, React & AWS

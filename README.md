# Hướng Dẫn Triển Khai (Deploy) Hệ Thống Dalytics Lên AWS

Tài liệu này hướng dẫn chi tiết các bước để triển khai toàn bộ hệ thống phân tích dữ liệu Dalytics lên môi trường điện toán đám mây AWS sử dụng Terraform, Docker, ECS Fargate, S3 và ECR.

---

## 1. Chuẩn Bị & Các File Cần Tinh Chỉnh Trước Khi Deploy

Để deploy thành công, bạn cần chuẩn bị các công cụ và cấu hình các tệp tin cấu hình cốt lõi dưới đây.

### A. Chuẩn bị tài nguyên và công cụ
- **Tài khoản AWS**: Một tài khoản AWS hoạt động. Tạo một người dùng IAM có quyền lập trình và được gán chính sách Administrator (hoặc PowerUser kèm IAM) để Terraform có thể khởi tạo tài nguyên mạng VPC, RDS, ECS, S3, IAM, CloudWatch.
- **AWS CLI & Terraform (phiên bản >= 1.6)**: Phải cài đặt sẵn trên máy cục bộ của bạn và cấu hình sẵn credentials.
- **Docker Desktop**: Cần khởi động sẵn Docker trên máy của bạn để thực hiện đóng gói (build) Backend Docker image trước khi push lên AWS ECR.
- **Slack Incoming Webhook (Tùy chọn)**: Tạo Webhook cho kênh Slack của nhóm nếu bạn muốn GitHub Actions tự động gửi tin nhắn báo cáo tiến trình biên dịch và deploy.

---

### B. Các file cần tinh chỉnh trong dự án

Trước khi thực hiện lệnh deploy, bạn cần mở và chỉnh sửa các tệp tin sau để khớp với thông số tài khoản và mong muốn bảo mật của bạn:

#### tệp cấu hình hạ tầng Terraform (`.tfvars`)
Nằm trong thư mục `terraform/env/`:
- **[staging.tfvars](file:///d:/DienToanDamMay/DataAnalyticsAPI/terraform/env/staging.tfvars)** (Dành cho Staging)
- **[production.tfvars](file:///d:/DienToanDamMay/DataAnalyticsAPI/terraform/env/production.tfvars)** (Dành cho Production)

*Các tham số bắt buộc phải sửa đổi giá trị:*
- `s3_bucket_name`: Đổi thành một tên duy nhất trên toàn cầu (ví dụ: `dalytics-uploads-tquyen-staging`).
- `db_username` & `db_password`: Tài khoản và mật khẩu truy cập cơ sở dữ liệu RDS PostgreSQL do bạn tự quyết định.
- `secret_key`: Khóa bí mật ký JWT Token bảo mật. Nên tạo ngẫu nhiên bằng cách chạy lệnh `openssl rand -hex 32` trên terminal để lấy một chuỗi ký tự ngẫu nhiên an toàn.
- `sns_alert_email`: Nhập email của bạn để nhận thông báo cảnh báo giám sát hệ thống CloudWatch khi quá tải CPU/RAM hoặc lỗi ALB 5xx.

---

## 2. Hướng Dẫn Deploy Thực Tế Lên AWS (Từng Bước)

Quy trình deploy hệ thống hoàn chỉnh lên AWS sử dụng Terraform để dựng hạ tầng, Docker để đóng gói ứng dụng, ECR/ECS Fargate để chạy dịch vụ và S3 để host Frontend.

---

### Bước 1: Cấu hình thông tin xác thực AWS (AWS Credentials)
Trước tiên, hãy chắc chắn rằng bạn đã cài đặt AWS CLI trên máy của mình.
1. Khởi tạo cấu hình quyền truy cập AWS:
   ```bash
   aws configure
   ```
2. Nhập thông tin `AWS Access Key ID`, `AWS Secret Access Key`, mặc định region là `ap-southeast-1` (Singapore) và định dạng output là `json`.

### Bước 2: Khởi tạo hạ tầng bằng Terraform
1. Di chuyển vào thư mục hạ tầng:
   ```bash
   cd terraform
   ```
2. Khởi tạo provider và tải các module bổ trợ:
   ```bash
   terraform init
   ```
3. Xem trước kế hoạch thay đổi (Dry Run):
   ```bash
   terraform plan -var-file="env/staging.tfvars"
   ```
4. Áp dụng cấu hình để tạo tài nguyên AWS (VPC, RDS, S3, ECR, ECS):
   ```bash
   terraform apply -var-file="env/staging.tfvars" -auto-approve
   ```
   *Lưu ý: Lưu lại các thông tin hiển thị ở phần **Outputs** sau khi kết thúc lệnh (ví dụ: `alb_dns_name` và `ecr_repository_url`).*

---

### Bước 3: Build và Push Docker Image Backend lên ECR
1. Nhìn vào kết quả đầu ra (outputs) của Terraform để lấy link ECR repository URL (ví dụ: `<AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/data-analytics-api`).
2. Đăng nhập Docker của máy bạn vào kho ECR của AWS:
   ```bash
   aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 146147823273.dkr.ecr.ap-southeast-1.amazonaws.com/data-analytics-api
   ```
3. Đóng gói Docker image từ thư mục gốc của dự án (nơi có `Dockerfile`):
   ```bash
   cd ..
   docker build -t data-analytics-backend:latest .
   ```
4. Đóng thẻ (tag) cho image khớp với địa chỉ ECR:
   ```bash
   docker tag data-analytics-backend:latest 146147823273.dkr.ecr.ap-southeast-1.amazonaws.com/data-analytics-api:latest
   ```
5. Đẩy image lên AWS ECR:
   ```bash
   docker push 146147823273.dkr.ecr.ap-southeast-1.amazonaws.com/data-analytics-api:latest
   ```

---

### Bước 4: Kích hoạt triển khai ECS Fargate (Force Deploy)
Khi Docker image đã nằm trên ECR, yêu cầu ECS Fargate tải image mới và khởi tạo container thật:
```bash
aws ecs update-service --cluster data-analytics-staging --service backend-service --force-new-deployment --region ap-southeast-1
```
*Bạn có thể xem DNS của Load Balancer từ output Terraform (ví dụ: `http://staging-alb-xxx.ap-southeast-1.elb.amazonaws.com`) để kiểm tra API qua endpoint `/health`.*

---

### Bước 5: Build và Deploy Frontend
1. Lấy DNS Load Balancer của backend ở bước trên.
2. Di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
3. Tạo tệp `.env` cấu hình API URL cho ReactJS:
   ```env
   VITE_API_URL=http://<YOUR_ALB_DNS_NAME>
   ```
4. Biên dịch mã nguồn Frontend sang bản tĩnh tối ưu:
   ```bash
   npm install
   npm run build
   ```
5. Đẩy toàn bộ nội dung trong thư mục `dist` lên Amazon S3 Bucket được cấu hình Static Web Hosting hoặc phân phối qua CloudFront CDN để hiển thị ứng dụng cho người dùng cuối.

---

## 3. Hướng Dẫn Hủy Toàn Bộ Hạ Tầng & Dữ Liệu (Teardown)

Để dọn dẹp tài nguyên nhằm tránh phát sinh chi phí khi không còn nhu cầu sử dụng, bạn thực hiện quy trình hủy theo các bước sau:

### Bước 1: Xóa Kho Lưu Trữ ECR (Do có chứa ảnh Docker nên cần xóa cưỡng bức)
Sử dụng AWS CLI để xóa cưỡng bức kho lưu trữ ảnh Docker, ngăn chặn lỗi chặn xóa tài nguyên từ Terraform:
```bash
aws ecr delete-repository --repository-name data-analytics-api --force
```

### Bước 2: Hủy Hạ Tầng Bằng Terraform
Di chuyển vào thư mục `terraform` và thực hiện lệnh hủy bằng file cấu hình biến môi trường tương ứng:
```bash
cd d:\DienToanDamMay\DataAnalyticsAPI\terraform
terraform destroy -var-file="env/staging.tfvars" -auto-approve
```
*Lưu ý: Lệnh này sẽ xóa sạch cơ sở dữ liệu RDS PostgreSQL và dọn sạch các tệp tin trong S3. Mọi thông tin tài khoản và dữ liệu CSV sẽ biến mất vĩnh viễn và không thể khôi phục.*

---

## 4. Cấu Hình Tự Động Hóa Triển Khai (CI/CD)

Khi mã nguồn được lưu trữ trên GitHub, bạn chỉ cần push code lên nhánh tương ứng để kích hoạt deploy tự động. Hãy vào mục **Settings > Secrets and Variables > Actions** trên GitHub repository của bạn và thêm các Secret sau:

| Tên Secret | Mô tả | Ví dụ |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | Access Key AWS có quyền deploy | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Secret Key tương ứng | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `ECR_REGISTRY` | AWS ECR Registry URL | `<ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com` |
| `SLACK_WEBHOOK` | Webhook gửi thông báo trạng thái deploy lên Slack | `https://hooks.slack.com/services/...` |
| `STAGING_API_URL` | DNS của ALB Staging (kiểm thử Smoke Test) | `http://staging-alb-xxx.ap-southeast-1.elb.amazonaws.com` |
| `PROD_API_URL` | Tên miền Production của backend | `https://api.yourdomain.com` |

---

# B1. 

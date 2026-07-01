# HƯỚNG DẪN TRIỂN KHAI VÀ HỦY HỆ THỐNG TRÊN AWS

Tài liệu này hướng dẫn chi tiết cách khởi dựng (Deploy) hệ thống phân tích dữ liệu từ đầu và cách dọn dẹp (Destroy) toàn bộ tài nguyên trên AWS để tránh phát sinh chi phí.

---

## I. Yêu Cầu Cài Đặt (Prerequisites)
Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
1. **AWS CLI**: Đã cấu hình tài khoản AWS qua lệnh `aws configure`.
2. **Terraform** (Phiên bản >= 1.5.0).
3. **Git**: Để quản lý mã nguồn và đẩy lên GitHub.

---

## II. Các Bước Triển Khai Hệ Thống (Deploy) Từ Đầu

### Bước 1: Khởi tạo Terraform
1. Mở terminal và di chuyển đến thư mục chứa mã nguồn Terraform:
   ```bash
   cd terraform
   ```
2. Khởi tạo Terraform để tải các provider cần thiết (AWS, Random...):
   ```bash
   terraform init
   ```

### Bước 2: Kiểm tra cấu hình biến môi trường
Mở tệp `terraform/env/staging.tfvars` và kiểm tra/chỉnh sửa các thông tin cấu hình (như tên bucket S3, cấu hình DB...):
* `aws_region`: Khu vực AWS (khuyên dùng `ap-southeast-1` - Singapore).
* `environment`: Môi trường triển khai (ví dụ `staging`).
* `db_username` & `db_password`: Tài khoản quản trị cơ sở dữ liệu PostgreSQL.

### Bước 3: Tạo tài nguyên trên AWS
Chạy lệnh tạo lập hạ tầng tự động. Quá trình này sẽ mất khoảng **5 đến 7 phút** để dựng toàn bộ 52 tài nguyên (VPC, Subnets, RDS, ECS Cluster, ALB, S3...):
```bash
terraform apply -var-file="env/staging.tfvars" -auto-approve
```

**Lưu ý sau khi tạo xong:**
Màn hình console sẽ hiển thị các giá trị đầu ra (Outputs). Hãy lưu lại địa chỉ **`alb_dns_name`** (địa chỉ Load Balancer của bạn), ví dụ:
`http://data-analytics-alb-staging-XXXXXXXXXX.ap-southeast-1.elb.amazonaws.com`

---

### Bước 4: Cấu hình biến môi trường Frontend
1. Mở tệp `frontend/.env`.
2. Cập nhật địa chỉ `VITE_API_URL` bằng địa chỉ `alb_dns_name` vừa nhận được:
   ```text
   VITE_API_URL=http://data-analytics-alb-staging-XXXXXXXXXX.ap-southeast-1.elb.amazonaws.com
   ```

---

### Bước 5: Cấu hình Secrets trên GitHub
Để CI/CD GitHub Actions có thể tự động build và deploy code lên AWS, bạn cần cập nhật các thông số bảo mật của kho lưu trữ (Repository) trên GitHub:
1. Vào **GitHub Repository > Settings > Secrets and variables > Actions**.
2. Nhấp vào **New repository secret** để thêm/cập nhật các biến sau:
   * **`AWS_ACCESS_KEY_ID`**: Access Key ID của tài khoản AWS IAM có quyền tạo ECS/RDS.
   * **`AWS_SECRET_ACCESS_KEY`**: Secret Access Key tương ứng.
   * **`STAGING_API_URL`**: Địa chỉ Load Balancer mới (ví dụ: `http://data-analytics-alb-staging-XXXXXXXXXX.ap-southeast-1.elb.amazonaws.com`).
   * **`STAGING_DB_HOST`**: (Nếu có yêu cầu cấu hình) Endpoint của RDS Database.

---

### Bước 6: Đẩy code để chạy CI/CD Deploy
Đẩy mã nguồn lên nhánh **`develop`** để kích hoạt GitHub Actions tự động đóng gói ứng dụng thành Docker Image, đẩy lên ECR và deploy lên cụm ECS Fargate:
```bash
git add .
git commit -m "deploy: update staging api url"
git push origin develop
```
*Bạn có thể theo dõi tiến trình deploy tại tab **Actions** trên GitHub. Khi workflow CD Staging chuyển sang **màu xanh lá** tức là hệ thống đã online.*

---

## III. Các Bước Hủy Bỏ Hệ Thống (Destroy)
Khi không dùng đến hệ thống (ví dụ: sau khi chấm điểm, cuối ngày làm việc hoặc muốn làm lại từ đầu), bạn **bắt buộc phải hủy hạ tầng** để tránh phát sinh hóa đơn tiền điện toán đám mây của AWS.

### Bước 1: Dọn dẹp tài nguyên thông qua Terraform
1. Mở terminal tại thư mục `terraform`:
   ```bash
   cd terraform
   ```
2. Chạy lệnh hủy toàn bộ tài nguyên:
   ```bash
   terraform destroy -var-file="env/staging.tfvars" -auto-approve
   ```
   *Quá trình này mất khoảng **3 đến 5 phút** để gỡ bỏ hoàn toàn cụm ECS, RDS PostgreSQL, ALB và các cài đặt mạng mạng VPC.*

### Bước 2: Kiểm tra thủ công (Khuyên dùng)
Truy cập vào AWS Web Console để kiểm tra xem các tài nguyên tốn chi phí đã được xóa sạch chưa:
* **RDS**: Kiểm tra phần Databases xem còn database chạy không.
* **ECS**: Xem có Cluster nào đang active không.
* **EC2 > Load Balancers**: Đảm bảo không còn Load Balancer nào đang hoạt động.

---

## IV. Xử Lý Sự Cố Với AWS SES (Sandbox Mode)
Vì tài khoản AWS SES mặc định nằm trong hộp cát (Sandbox), việc gửi mã OTP đăng ký / quên mật khẩu cần tuân thủ:

1. **Email Gửi (Sender)**: Phải là email đã xác minh thành công.
2. **Email Nhận (Receiver)**: 
   * **Trong Sandbox**: Phải được xác minh thủ công trên AWS SES (nhấn **Create identity** > nhập email nhận > bấm link xác nhận gửi vào hòm thư đó).
   * **Trong Production (Mọi email)**: Cần tạo yêu cầu hỗ trợ **Sandbox Removal / Service Limit Increase** trên dịch vụ **Service Quotas** của AWS (khu vực Singapore) để nâng cấp tài khoản của bạn lên bản Production. Sau khi được duyệt (thường dưới 24h), bạn có thể gửi OTP cho bất kỳ ai!

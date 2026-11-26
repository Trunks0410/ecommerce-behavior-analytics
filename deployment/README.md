# EC2 Deployment Guide (Docker Compose + Nginx Reverse Proxy)

Thư mục này chứa cấu hình triển khai gọn nhẹ cho 1 EC2 instance (không dùng Kubernetes, không chạy `qwen-inference` nặng, mở duy nhất Port `80`/`443` qua `nginx-proxy`).

## Các file trong `deployment/`
- `docker-compose.yaml`: Chạy `mysql`, 6 service (`ecommerce`, `analyze`, `shipment`) và `nginx-proxy` trên mạng `datn-network`.
- `nginx/default.conf`: Reverse proxy cổng `80` cho `shop.*`, `analytics.*`, `shipper.*` (mặc định IP EC2 vào thẳng `ecommerce-gui` + `/api/`).
- `env.example`: Mẫu gom toàn bộ biến môi trường về 1 file (copy thành `.env` trước khi chạy).
- `bashprofile`: Nạp biến môi trường mặc định (`IMAGE_TAG`, `SEARCH_MODE=ram`) và alias thao tác nhanh (`dc`, `dcup`, `dclogs`...).
- `docker-compose.sh`: Script quản lý vòng đời deploy trên EC2.

## Triển khai nhanh trên EC2
```bash
cd ~/ecommerce/deployment
chmod +x docker-compose.sh

# 1. Tạo Swap 2GB (khuyên dùng cho EC2 2-4GB RAM)
./docker-compose.sh init-swap

# 2. Tạo .env và điền mật khẩu/secret thật
./docker-compose.sh setup-env
nano .env

# 3. Nạp profile (tùy chọn) và deploy
source ./bashprofile
./docker-compose.sh deploy
```

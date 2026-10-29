# Shipment & Shipper Microservice

Dịch vụ vận chuyển và cổng điều phối giao nhận (Shipper Portal) độc lập, tách biệt hoàn toàn với Ecommerce Platform.

## 1. Cấu Trúc Thư Mục

```text
shipment/
├── backend/                  # API Microservice Backend (Port 8090)
│   ├── server.js             # Entrypoint server Express
│   ├── package.json
│   └── src/
│       ├── controllers/      # shipment.controller.js, shipper.controller.js
│       ├── routes/           # shipment.routes.js, shipper.routes.js
│       ├── services/         # shipment.service.js, shipper.service.js
│       └── middleware/       # auth.js, upload.js
└── frontend/                 # Giao diện Shipper Dashboard độc lập (Port 5174)
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── api/              # axiosClient.ts, shipperApi.ts
        ├── context/          # AuthContext.tsx
        ├── components/       # Navbar, StatusBadge, ProofModal, FailModal
        └── pages/            # LoginPage, DashboardPage, OrdersPage, ReconciliationPage, ProfilePage
```

## 2. Các API Microservice

### Shipment API (`/api/v1/shipments`):
- `GET /order/:orderId`: Lấy thông tin vận đơn theo mã đơn hàng
- `GET /:id/history`: Lấy lịch sử hành trình vận đơn
- `POST /:id/history`: Cập nhật trạng thái vận đơn (IN_TRANSIT, DELIVERED, FAILED...)

### Shipper API (`/api/v1/shipper`):
- `POST /login`: Đăng nhập cổng Shipper Portal
- `GET /profile`: Xem thông tin tài khoản shipper
- `PUT /profile`: Cập nhật thông tin cá nhân và khu vực giao nhận
- `GET /orders`: Lấy danh sách các đơn hàng shipper được phân công hoặc nhận giao
- `GET /cod/collected`: Danh sách đơn hàng đang giữ tiền mặt thu hộ (COD)
- `POST /cod/reconcile`: Gửi yêu cầu đối soát, bàn giao tiền COD về bưu cục
- `GET /cod/reconciliations`: Xem lịch sử các đợt đối soát tiền COD
- `POST /upload`: Upload ảnh bằng chứng giao hàng hoặc avatar

## 3. Hướng Dẫn Chạy Dịch Vụ

### Khởi chạy Backend (Port 8090):
```bash
cd shipment/backend
npm install
npm run dev
```

### Khởi chạy Frontend Shipper Dashboard (Port 5174):
```bash
cd shipment/frontend
npm install
npm run dev
```
Giao diện Shipper Portal sẽ chạy tại: **http://localhost:5174**
Tài khoản thử nghiệm:
- **Email:** `shipper@gmail.com`
- **Mật khẩu:** `123456`

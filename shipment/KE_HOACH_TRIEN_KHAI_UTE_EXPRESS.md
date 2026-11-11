# Kế hoạch triển khai microservice UTE Express

**Trạng thái:** Đã triển khai; kiểm thử local hoàn tất  
**Mục tiêu:** Tách dịch vụ vận chuyển thành microservice độc lập trong `shipment/`, đồng thời tích hợp với website trong `Ecommerce-platform/` qua API.

## 1. Mục tiêu đồ án và phạm vi

Đề tài chính vẫn là **“Xây dựng website thương mại điện tử tích hợp phân tích hành vi khách hàng”**. UTE Express là dịch vụ hỗ trợ giao hàng cho website, có quy trình đủ đơn giản để trình diễn và kiểm thử từ đầu đến cuối.

Luồng nghiệp vụ cần đáp ứng:

1. Shop xử lý đơn trên website và chọn **UTE Express** làm đơn vị vận chuyển.
2. Website gửi yêu cầu giao hàng cùng thông tin cần thiết sang shipment service.
3. UTE Express tạo vận đơn và tự động phân công shipper theo quy tắc trong [`../ke-hoach-trien-khai-don-vi-van-chuyen.md`](../ke-hoach-trien-khai-don-vi-van-chuyen.md).
4. Shipper đăng nhập cổng riêng trong `shipment/frontend/`, xem đơn được giao và cập nhật tiến độ bằng các hành động hợp lệ.
5. Shipment service lưu tracking; website truy xuất và hiển thị tiến độ cho shop/khách hàng.

### Ngoài phạm vi đợt đầu

- GPS, bản đồ hoặc tracking realtime.
- Tối ưu tuyến đường, AI/ML, quản lý đội xe và lịch ca phức tạp.
- Tích hợp API của hãng vận chuyển bên ngoài, SMS thật hoặc nhiều provider.
- Hệ thống rating, tài chính/đối soát nâng cao, trừ khi cần thiết để giữ luồng hiện có chạy đúng.
- Xóa `Ecommerce-platform/` hoặc chuyển nghiệp vụ thương mại điện tử sang shipment service.

## 2. Ranh giới hệ thống

```text
Ecommerce-platform/                  shipment/
Website thương mại điện tử           UTE Express microservice
├── Đơn hàng, shop, khách hàng        ├── Backend API
├── Thanh toán, hành vi khách hàng    ├── Database riêng
└── Gọi API / hiển thị tracking       └── Frontend vận hành shipper
             │                                  ▲
             └──────── HTTP API ────────────────┘
```

- Ecommerce-platform sở hữu đơn hàng, shop, khách hàng, thanh toán và trạng thái nghiệp vụ của đơn.
- Shipment service sở hữu vận đơn, dữ liệu giao nhận cần thiết, shipper, phân công và tracking.
- Hai hệ thống không dùng chung database, model, ORM instance hay import code của nhau.
- Shipment lưu mã đơn tham chiếu do website cung cấp; không tạo khóa ngoại tới database ecommerce.
- Các thay đổi và dữ liệu hiện có trong website phải được giữ nguyên. Việc này không bao gồm xóa thư mục website.

## 3. Khảo sát hiện trạng trước khi sửa code

Trước khi triển khai, rà soát và lập danh sách phụ thuộc cần chuyển đổi:

- [`backend/server.js`](backend/server.js) — hiện khởi tạo kết nối qua cấu hình của Ecommerce-platform.
- [`backend/src/services/shipment.service.js`](backend/src/services/shipment.service.js) — hiện dùng model và tiện ích từ Ecommerce-platform, đồng thời chứa quy tắc cập nhật ShopOrder/COD/hoàn hàng.
- [`backend/src/services/shipper.service.js`](backend/src/services/shipper.service.js) — hiện đọc user, role, đơn hàng và COD từ database website.
- [`frontend/src/api/shipperApi.ts`](frontend/src/api/shipperApi.ts) — hợp đồng frontend hiện tại cần được đối chiếu với API sau khi tách.
- [`README.md`](README.md) — hướng dẫn hiện có cần cập nhật sau khi thống nhất setup và tài khoản demo.

Trong bước khảo sát, cần phân loại quy tắc nào thuộc dịch vụ vận chuyển và quy tắc nào thuộc ecommerce. Shipment service không được tiếp tục tự cập nhật ShopOrder, thanh toán, tồn kho, hoàn tiền hoặc ví của shop.

## 4. Quy ước dữ liệu và vòng đời dự kiến

### 4.1 Thông tin shipment

Shipment lưu tối thiểu:

- Mã vận đơn và mã đơn tham chiếu phía website.
- Provider cố định `UTE Express`.
- Tên, số điện thoại và địa chỉ lấy hàng; tên, số điện thoại và địa chỉ nhận hàng.
- Ghi chú giao nhận; phương thức thanh toán giao hàng và số tiền COD nếu có.
- Phí vận chuyển nếu do website cung cấp hoặc hai hệ thống đã thống nhất cách tính.
- Shipper được giao, trạng thái, thời điểm tạo/cập nhật.
- Các sự kiện tracking và lý do giao thất bại.

Chỉ gửi dữ liệu cần cho giao hàng; không sao chép hồ sơ khách hàng hoặc dữ liệu thanh toán không liên quan.

### 4.2 Trạng thái và chuyển trạng thái

State machine duy nhất ở backend là nguồn quy tắc cho API và frontend. Dự kiến:

```text
PENDING_ASSIGNMENT → ASSIGNED → ACCEPTED → PICKED_UP
                                            ↓
DELIVERY_FAILED ← OUT_FOR_DELIVERY ← IN_TRANSIT
       ↓                                      ↓
REASSIGNED / RESCHEDULED                 DELIVERED
       └──────────────→ ASSIGNED

RETURNED / CANCELLED: trạng thái kết thúc theo quyền và điều kiện đã chốt.
```

Tên trạng thái cuối cùng phải được chuẩn hóa với các enum hiện có trước khi viết code. Backend kiểm tra trạng thái hiện tại, actor, quyền sở hữu shipment và dữ liệu bắt buộc cho hành động; frontend không gửi một trạng thái tùy ý để ghi trực tiếp.

Mỗi chuyển trạng thái ghi một sự kiện tracking với thời gian do server tạo, actor, trạng thái trước/sau và ghi chú/lý do nếu cần.

### 4.3 Auto-dispatch

Áp dụng quy tắc gọn, giải thích được và kiểm thử được:

1. Chỉ chọn shipper đang hoạt động và `AVAILABLE`.
2. Ưu tiên shipper có ít shipment đang xử lý nhất.
3. Dùng rating và số đơn hoàn tất làm tiêu chí phụ nếu dữ liệu có sẵn; không bắt buộc thêm rating vào phiên bản đầu.
4. Nếu không có shipper phù hợp, để shipment ở `PENDING_ASSIGNMENT` trong hàng chờ; không gán shipper bận/offline.
5. Đảm bảo hai yêu cầu đồng thời không cùng chiếm quá khả năng được cấu hình của một shipper.

Khu vực hoạt động có thể dùng như điều kiện lọc nếu thông tin địa chỉ hiện tại đủ nhất quán; không giả định nhận diện địa chỉ chính xác bằng cách tìm chuỗi tùy tiện.

## 5. Hợp đồng tích hợp đề xuất

API có thể điều chỉnh theo convention hiện tại, nhưng cần thống nhất request/response, mã lỗi, enum, xác thực và idempotency trước khi frontend/backend cùng triển khai.

### Ecommerce-platform gọi shipment service

```text
POST /api/v1/shipments
GET  /api/v1/shipments/by-reference/:orderReference
GET  /api/v1/shipments/:id
GET  /api/v1/shipments/:id/tracking
```

Yêu cầu tạo shipment gồm mã đơn tham chiếu duy nhất, thông tin lấy/nhận hàng, ghi chú giao hàng và thông tin COD/phí theo hợp đồng đã chốt. Tạo vận đơn phải idempotent: retry cùng mã đơn tham chiếu không tạo shipment thứ hai.

### Shipper portal gọi shipment service

```text
POST /api/v1/auth/login
GET  /api/v1/shipper/profile
GET  /api/v1/shipper/shipments
POST /api/v1/shipments/:id/accept
POST /api/v1/shipments/:id/pickup
POST /api/v1/shipments/:id/start
POST /api/v1/shipments/:id/complete
POST /api/v1/shipments/:id/fail
```

API tra cứu shipment/tracking công khai hay có xác thực cần quyết định trước khi triển khai. Không đưa dữ liệu nhạy cảm hoặc thông tin người nhận đầy đủ vào phản hồi tra cứu công khai.

### Xác thực giữa hai backend

Chọn một cơ chế service-to-service phù hợp, ví dụ API key riêng qua biến môi trường và HTTPS khi triển khai. Không dùng JWT đăng nhập của shipper thay cho xác thực từ website. Không ghi secret thật vào code, tài liệu hay seed.

### Đồng bộ trạng thái về website

Đợt đầu đề xuất website truy vấn shipment service khi cần hiển thị chi tiết vận đơn, thay vì thêm webhook/message broker. Website chỉ ánh xạ các trạng thái giao hàng cần thiết sang trạng thái hiển thị của đơn; shipment service không gọi ngược để sửa trực tiếp database website.

## 6. Database và triển khai độc lập

- Chọn database/schema riêng cho shipment, cấu hình bằng biến môi trường riêng; ưu tiên dùng cùng loại hệ quản trị đã có nếu phù hợp với dependency hiện tại, nhưng không dùng chung database ecommerce.
- Chuyển kết nối DB, models, migrations và seed cần thiết vào `shipment/backend`.
- Dữ liệu ban đầu gồm UTE Express và một số shipper demo; mật khẩu được hash và tài khoản demo chỉ dùng cho môi trường phát triển/trình diễn.
- Xây dựng endpoint health check để xác nhận process và kết nối database.
- Backend phải cài/chạy/migrate/seed/test chỉ với `shipment/backend`; frontend chỉ gọi API shipment service.
- Tách cấu hình CORS, URL API, upload file và JWT/service secret qua biến môi trường.

Mô hình ban đầu nên giữ gọn: `User/Agent`, `Shipment`, `ShipmentStatusEvent` và (nếu giao lại cần bảo toàn từng lần thử) `DeliveryAttempt`. Chỉ thêm bảng COD hoặc provider nếu nghiệp vụ đã chốt yêu cầu.

## 7. Các giai đoạn triển khai

### Giai đoạn 0 — Review kế hoạch và chốt quyết định

- Duyệt phạm vi, luồng tạo shipment, trạng thái, cơ chế auth giữa service, kiểu database và cách website lấy tracking.
- Xác nhận dữ liệu nào website gửi, ai chịu trách nhiệm tính phí/COD và có cần chức năng đối soát hiện tại không.
- Chỉ bắt đầu code sau khi các quyết định ảnh hưởng kiến trúc được chốt.

**Đầu ra:** API contract, state machine và danh sách phạm vi được duyệt.

### Giai đoạn 1 — Gỡ phụ thuộc chéo và dựng nền service

- Tách DB config, model, migration, seed và tiện ích cần thiết vào `shipment/backend`.
- Loại bỏ import/query tới Ecommerce-platform; không còn truy cập `ShopOrder`, `ParentOrder`, payment, inventory hoặc wallet.
- Thiết lập env mẫu không chứa secret, health endpoint và hướng dẫn chạy độc lập.

**Kiểm tra:** shipment backend khởi động, migrate và seed khi Ecommerce backend không chạy.

### Giai đoạn 2 — Shipment API, state machine và dispatch

- Xây tạo/tra cứu shipment với idempotency theo mã đơn tham chiếu.
- Xây state machine, phân quyền admin/shipper và tracking append-only theo quy ước ứng dụng.
- Xây auto-dispatch theo trạng thái sẵn sàng/tải công việc; hỗ trợ hàng chờ khi không có ứng viên.
- Cập nhật các hành động giao nhận trong transaction phù hợp và xử lý xung đột phân công.

**Kiểm tra:** unit/integration test cho tạo trùng, dispatch, quyền và mọi transition hợp lệ/không hợp lệ.

### Giai đoạn 3 — Shipper portal

- Nối đăng nhập và lấy profile với tài khoản riêng của service.
- Hiển thị các shipment được phân công; shipper chỉ đọc/cập nhật các shipment được phép.
- Hoàn thiện nút hành động theo transition server cho phép, tracking timeline, lý do thất bại và bằng chứng giao hàng nếu cần.
- Gỡ dữ liệu giả khỏi các luồng vận hành; dữ liệu mẫu chỉ dùng rõ ràng trong test/demo.

**Kiểm tra:** build frontend, đăng nhập, cập nhật tiến độ và kiểm thử phân quyền.

### Giai đoạn 4 — Tích hợp Ecommerce-platform

- Thêm lựa chọn UTE Express vào luồng shop xử lý đơn tại thời điểm hàng sẵn sàng bàn giao đã thống nhất.
- Gọi API tạo shipment với mã tham chiếu ổn định và cơ chế retry không tạo trùng.
- Hiển thị mã vận đơn, trạng thái và timeline từ service ở trang phù hợp.
- Xử lý timeout/service unavailable rõ ràng; không đánh dấu đã tạo vận đơn nếu service chưa xác nhận.

**Kiểm tra:** tích hợp hai ứng dụng qua HTTP thật trong môi trường phát triển, không truy cập DB chéo.

### Giai đoạn 5 — Demo, tài liệu và nghiệm thu

- Chạy test backend, build/lint frontend và test tích hợp theo các script thực tế của repository.
- Viết hướng dẫn env, setup DB, migrate/seed, chạy từng service và tài khoản demo trong `shipment/README.md`.
- Chuẩn bị demo từ shop chọn UTE Express đến shipper hoàn tất giao và website hiển thị tracking.
- Ghi lại các giới hạn đã biết để không mở rộng ngoài phạm vi đồ án.

## 8. Tiêu chí nghiệm thu

- [x] `Ecommerce-platform/` vẫn nguyên vẹn và là website chính.
- [x] Toàn bộ code/runtime/migration/seed/frontend của UTE Express nằm dưới `shipment/`, ngoại trừ adapter HTTP thuộc website.
- [x] Shipment service không dùng chung DB, model hay import module của Ecommerce-platform.
- [x] Shop chọn UTE Express và website tạo vận đơn qua API.
- [x] Retry yêu cầu tạo vận đơn không sinh bản ghi trùng.
- [x] Auto-dispatch chọn shipper hợp lệ theo quy tắc; không có ứng viên thì vào hàng chờ.
- [x] Shipper đăng nhập bằng tài khoản demo và chỉ thao tác shipment được phân công.
- [x] Chuyển trạng thái hợp lệ thành công; sai thứ tự/sai quyền bị từ chối.
- [x] Mọi sự kiện giao nhận được ghi tracking với thời gian server.
- [x] Giao thất bại có lý do và quy trình giao lại/chuyển hoàn.
- [x] Website lấy mã vận đơn, trạng thái và timeline qua backend proxy có xác thực.
- [x] Đã kiểm tra dispatch/state machine, idempotency và luồng giao nhận qua unit/API smoke tests.
- [x] Đã migrate, seed, test và chạy shipment service độc lập với Ecommerce backend.

**Kết quả kiểm thử local:** migration/seed thành công trên database `ute_express` riêng; 6/6 domain tests đạt; build cả hai frontend đạt; API smoke test xác nhận service-to-service create/lookup, idempotency, auto-dispatch, shipper login, toàn bộ trạng thái giao hàng và tracking. Chưa chạy giao diện shop/khách hàng với một đơn ecommerce thực trong database; website/backend build và HTTP client đã được kiểm tra riêng.

## 9. Các quyết định cần review trước khi code

Đây là các lựa chọn đề xuất, cần xác nhận hoặc điều chỉnh:

1. Tạo shipment khi shop chọn UTE Express và xác nhận hàng sẵn sàng bàn giao, không tạo ngay lúc khách checkout.
2. Website gọi shipment service để lấy tracking theo nhu cầu; chưa triển khai webhook/realtime.
3. Website là nguồn chuẩn của giá đơn hàng và COD; shipment chỉ nhận số tiền cần thu để shipper biết khi giao. Phí vận chuyển do website tính hay service tính cần chốt theo luồng hiện tại.
4. Giữ auto-dispatch đơn giản theo tải công việc; rating là tiêu chí tùy chọn nếu dữ liệu sẵn có.
5. Giữ COD ở mức ghi nhận thông tin giao hàng; chỉ giữ đối soát COD nếu cần cho demo hoặc chức năng hiện có.
6. Chọn database/schema riêng cho shipment; không xóa hoặc gộp database của website.
7. Chốt phạm vi trang tra cứu công khai và dữ liệu được phép trả về trước khi mở endpoint không cần đăng nhập.

## 10. Tài liệu tham khảo

- Kế hoạch nghiệp vụ hiện tại: [`../ke-hoach-trien-khai-don-vi-van-chuyen.md`](../ke-hoach-trien-khai-don-vi-van-chuyen.md).
- Kinh nghiệm tham khảo: `LastMile-1/`, `lastmile-2/`, `fleetbase/` và `delivery-routes-optimization-for-logistics/`. Chỉ áp dụng ý tưởng phù hợp; không sao chép source hoặc mở rộng thành nền tảng logistics đầy đủ.

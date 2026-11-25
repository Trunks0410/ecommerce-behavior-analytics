# Kế hoạch Nâng cấp Hệ thống Tìm kiếm Đa ngôn ngữ & Gợi ý Cá nhân hóa

## 1. Mục tiêu tổng thể
1. **Nâng cấp Hệ thống Gợi ý Cá nhân hóa (`Recommendation Pipeline`)**: Chuyển từ trung bình cộng đơn giản sang mô hình kết hợp **Trọng số hành vi + Suy giảm thời gian (Time Decay) + Lọc/Phạt sản phẩm đã mua (Hard Filter / Soft Penalty) + Tín hiệu mua kèm (Co-Purchase)**.
2. **Tối ưu Tìm kiếm Ngữ nghĩa Việt–Anh trên máy không GPU**: Giảm phụ thuộc vào API dịch ngoài (tránh `HTTP 429`), khắc phục điểm yếu gặp từ lạ của `Anchor Centroid`, bằng kiến trúc **Model nhẹ đa ngôn ngữ + Lớp chiếu Projection (`384/512 → 2048`)** căn chỉnh trực tiếp vào không gian `Qwen3-VL` đang có.

---

## 2. Phần I — Hệ thống Gợi ý Cá nhân hóa (2048-dim Behavior Pipeline)

### 2.1. Hiện trạng & Tính khả thi
- **Đã có sẵn**: `analyze-server` đã nạp ma trận **5.000 vector `Float32Array` (2048 chiều, chuẩn hóa L2)** vào RAM (~40 MB), tính Cosine Similarity trong **5–15ms** mà không cần gọi `qwen-inference` hay thêm Vector DB ngoài (Qdrant/Milvus). `ecommerce-server` đã có sẵn bảng hành vi (`user_viewed_products`, `carts`, `order_items`) và cron `src/worker.js`.
- **Cần nâng cấp**: Bổ sung trọng số theo hành vi, suy giảm theo thời gian thực (`timestamp`), phân biệt lọc cứng/phạt mềm và ma trận đồng xuất hiện (`Co-Purchase`).

### 2.2. Công thức & Ý nghĩa các biến

#### Bước 1: Tạo Vector người dùng ($V_{user}$ — 2048 chiều)
$$V_{user} = \frac{\sum_{i=1}^{N} (w_i \cdot e^{-\lambda \Delta t_i} \cdot V_{item\_i})}{\sum_{i=1}^{N} (w_i \cdot e^{-\lambda \Delta t_i})}$$

- **$V_{item\_i}$**: Vector 2048 chiều của sản phẩm $i$ lấy từ `product_embeddings.npz`.
- **$w_i$ (Interaction Weight)**: Trọng số mức độ quan tâm (`view_item > 5s = 1.0`, `click_item = 1.5`, `add_to_cart = 3.0`, `purchase = 5.0`).
- **$\Delta t_i$**: Thời gian trôi qua từ lúc tương tác đến hiện tại (tính bằng **giờ**).
- **$\lambda$ (Time Decay)**: Tốc độ quên hành vi cũ (khuyến nghị khởi điểm $\lambda = 0.03\text{/giờ}$, sau ~23 giờ trọng số giảm còn 50%).
- **Bắt buộc**: Sau khi tính trung bình có trọng số, phải **chuẩn hóa L2 lại $V_{user}$** ($\|V_{user}\|_2 = 1$) trước khi tính Cosine Similarity.

#### Bước 2 & 3: Lọc bỏ, Phạt điểm ($\alpha$) và Kết hợp Mua kèm (`Co-Purchase`)
$$\text{Score}(X) = \big(0.7 \times \text{Cosine}(V_{user}, V_X) + 0.3 \times \text{CoPurchase}(B, X)\big) \times \text{Penalty}(X)$$

- **Stage 1 (Top-50 rộng)**: Lấy Top-50 sản phẩm có `Cosine(V_user, V_X)` cao nhất từ RAM.
- **Hard Filter ($\alpha = 0$)**: Áp dụng cho hàng bền vững / sản phẩm đã nằm trong `purchasedIds` (và `inCartIds` tùy ngữ cảnh) $\rightarrow$ loại bỏ trực tiếp.
- **Soft Penalty ($\alpha \in (0, 1)$)**:
  - $\alpha = 0.2$: Đã mua gần đây (hàng tiêu hao muốn hạn chế lặp dày đặc).
  - $\alpha = 0.5$: Đã xem nhiều lần nhưng chưa mua.
  - $\alpha = 1.0$: Sản phẩm mới chưa tương tác.
- **`CoPurchase(B, X)`**: Điểm mua kèm chuẩn hóa về $[0, 1]$ từ batch job ban đêm (thống kê sản phẩm hay đi cùng trong cùng `parent_order_id` hoặc cùng user trong 7 ngày). Trộn `0.7` (gu cá nhân) + `0.3` (mua kèm bổ trợ).

### 2.3. Lộ trình & Effort triển khai Gợi ý (3.5 – 5 ngày công)

| Giai đoạn | Hạng mục công việc | Effort | Ghi chú ổn định |
| :--- | :--- | :---: | :--- |
| **GĐ 1** | Nâng cấp `vectorSearch.service.js` tính $V_{user}$ với `w_i`, $\lambda$, $\Delta t_i$ (theo giờ) và L2-normalize | **0.5 – 1 ngày** | Giữ tương thích ngược với `viewedProductIds` cũ |
| **GĐ 2** | Nâng Stage 1 lên Top-50, bổ sung Hard Filter (`purchasedIds`) & Soft Penalty ($\alpha = 0.2 / 0.5$) | **1 ngày** | Tách cấu hình theo danh mục hàng bền vững / tiêu hao |
| **GĐ 3** | Viết cron job ban đêm trong `worker.js` tính `co_purchase_score` (chuẩn hóa $[0, 1]$) & nạp `Map` vào RAM `analyze-server` | **1 – 1.5 ngày** | Lưu snapshot JSON ra đĩa để giữ dữ liệu khi restart container |
| **GĐ 4** | Lưu 20 tương tác gần nhất (MySQL + in-memory TTL cache hoặc nâng cấp Redis Sorted Set `ZADD`) + Unit Test | **1 – 1.5 ngày** | Cold Start user mới luôn fallback sang `is_featured`/`sold_count` (K3 = 100%) |

### 2.4. Rủi ro & Biện pháp kiểm soát
- **Lệch ID giữa MySQL và `product_embeddings.npz`**: Ánh xạ theo `product_id` thực trong `product_metadata.json`, bỏ qua an toàn các ID chưa có vector.
- **Dữ liệu mua kèm thưa (`CoPurchase = 0`)**: Chuẩn hóa điểm mua kèm về $[0, 1]$; nếu chưa có cặp mua kèm thì công thức tự co về $0.7 \times \text{Cosine}$, không gây `NaN`.
- **Tránh lệch tâm khi gộp nhiều sở thích**: Với user xem nhiều ngành hàng khác nhau, có thể kết hợp điểm giữa $V_{user}$ tổng hợp và anchor gần nhất.

---

## 3. Phần II — Tối ưu Tìm kiếm Song ngữ Việt–Anh (Lightweight Encoder + Projection)

### 3.1. Nguyên lý chuyển đổi & Khắc phục giới hạn chế độ không Model
- **Hạn chế của `Anchor Centroid` hiện tại**: Khi tắt `qwen-inference`, hệ thống phải dịch từ khóa sang tiếng Anh rồi mượn vector từ `product_metadata.json`. Nếu gặp từ lạ (`anchors.length === 0`) hoặc Google Translate bị `HTTP 429`, độ chính xác giảm mạnh.
- **Giải pháp Lightweight Encoder + Projection Adapter**:
  ```text
  Input (Tiếng Việt / Tiếng Anh)
    ──► [Model A nhẹ: multilingual-e5-small] ──► Vector X (384d)
    ──► [Lớp Projection f(X): Linear / MLP]  ──► Vector Y' (2048d cùng hệ tọa độ Qwen3-VL)
    ──► [Cosine Similarity trong RAM]        ──► Top sản phẩm (không cần bật Qwen3-VL)
  ```
- **Vì sao hai bộ từ điển (Tokenizer ID) khác nhau vẫn khớp được?**
  - ID token (ví dụ `123` ở Model A vs `456` ở Qwen3-VL) chỉ dùng **nội bộ trong từng model** để tra Embedding Table riêng.
  - Tầng Projection $f(X) \rightarrow Y$ chỉ căn chỉnh **vector ngữ nghĩa đầu ra** của hai model cho cùng một sản phẩm, không phụ thuộc ID từ điển bên trong.
- **Lưu ý chọn Model A**:
  - Cho **Text (Việt + Anh)**: chọn model đa ngôn ngữ nhẹ (`intfloat/multilingual-e5-small` hoặc `paraphrase-multilingual-MiniLM-L12-v2`, ~470MB RAM, latency `< 50ms` trên CPU). Không dùng `all-MiniLM-L6-v2` vì yếu tiếng Việt.
  - Cho **Ảnh + Text**: nếu muốn thay cả Visual Search trên CPU, phải dùng Vision-Language encoder nhẹ (`SigLIP` / `CLIP`), không dùng model text-only.
- **Phương án thay thế đơn giản hơn (khi thêm nhiều sản phẩm mới sau này)**:
  - Nếu chọn **1 model nhẹ duy nhất** (`multilingual-e5-small` / `SigLIP`) để re-embed lại toàn bộ kho hàng 1 lần thì **không cần train lớp Projection**, thêm 1.000 sản phẩm mới chỉ mất vài giây; còn dùng **Projection** thì giữ nguyên được `product_embeddings.npz` 2048d hiện có mà không phải embed lại dữ liệu cũ.

### 3.2. Nguồn dữ liệu Train & Căn chỉnh Song ngữ Việt–Anh (5.000 – 15.000 mẫu)
Vì `multilingual-e5-small` đã được huấn luyện sẵn song ngữ Việt–Anh, chỉ cần tập dữ liệu domain E-commerce để căn chỉnh trục tọa độ sang `Qwen3-VL`:

1. **Nguồn chính tại chỗ (Sát kho hàng nhất — 10.000–15.000 mẫu)**:
   - Tận dụng sẵn **5.000 sản phẩm ABO** (`product_metadata.json`) và **5.000 vector đích `Y`** (`product_embeddings.npz`).
   - Kết hợp cấu trúc JSON đầy đủ (`[title] | Category: ... | Color: ... | Material: ...`) $\rightarrow$ cặp `(EN, Y)`.
   - Dịch offline 1 lần sang tiếng Việt (kết hợp bảng dịch trong `Ecommerce-platform/backend`) $\rightarrow$ cặp `(VI, Y)` trỏ tới cùng vector đích `Y`.
   - Trích xuất thêm các cụm từ khóa tìm kiếm ngắn 2–4 từ (`"áo sơ mi trắng"`, `"pink phone case"`) để mạng quen kiểu gõ ngắn của người dùng.
2. **Nguồn dữ liệu công khai mở rộng (nếu cần 20.000–50.000 mẫu)**:
   - **Sản phẩm tiếng Việt thật (Kaggle / Hugging Face)**: `tiki product dataset`, `shopee vietnam products`.
   - **Truy vấn tìm kiếm E-commerce (Hugging Face / GitHub)**: `amazon-science/esci-data`, `wayfair/WANDS`.
   - **Song ngữ Anh–Việt tổng quát (Hugging Face)**: một phần tập câu ngắn từ `PhoMT` hoặc `OPUS (en-vi)`.
   - *(Với dữ liệu ngoài chưa có vector đích, chạy 1 lần qua `Qwen3-VL` để lấy `Y` trước khi gộp train Projection.)*

### 3.3. Quy chuẩn Train & Kiểm chứng chất lượng Projection
- **Kiến trúc đề xuất**: 1 lớp `Linear(384 → 2048)` hoặc MLP nhỏ có `Dropout(0.2)` + `Weight Decay` + **L2 Normalization** ở đầu ra, dùng **Cosine Loss** (`1 - cosine_similarity(f(X), Y)`).
- **Kiểm chứng bắt buộc (4.500 Train / 500 Validation)**:
  - Đo `Recall@5` và `Recall@10` trên 500 sản phẩm chưa từng thấy: đạt **`Recall@5 ≥ 80%`** mới đưa vào thay thế `Anchor Centroid`.
  - Nếu `< 50%` (hai không gian quá lệch), chuyển sang phương án **1 model nhẹ duy nhất** cho cả index và search.

---

## 4. Phần III — Kiểm tra & Kế hoạch Tích hợp thực tế (`analyze-server` ↔ `ecommerce-server`)

### 4.1. Đối chiếu hiện trạng mã nguồn (Đã có vs Còn thiếu)
- **`analytics-platform/backend` (`analyze-server`, `:8088`)**:
  - Đã có: `server.js` mount `/api/v1/recommendations` và `/api/v1/search`, `vectorSearchEngine` nạp sẵn 5.000 vector `Float32Array` 2048d trong RAM, hàm `getRecommendationsByUserHistory(viewedProductIds, limit, signalWeights)`.
  - Còn thiếu: nhận `interactions` (`eventType`, `timestamp`) để tính $V_{user}$ có Time Decay $e^{-\lambda \Delta t_i}$; nhận `purchasedIds` / `inCartIds` / `viewedOftenIds` cho Hard Filter & Soft Penalty $\alpha$; và `coPurchaseMap` + route đồng bộ `/co-purchase-sync`.
- **`Ecommerce-platform/backend` (`ecommerce-server`, `:8080`)**:
  - Đã có: `product.service.js` (`getRecommendedProducts`) đang query `db.UserViewedProduct` (`viewed_at`), `db.Wishlist` (`created_at`), `db.CartItem`, và `vectorSearchClient.getRecommendationsByUserHistory` gọi `/api/v1/search/user-history`.
  - Còn thiếu: chưa query `db.OrderItem` (`purchasedIds` trong 7–30 ngày qua) để vừa lấy tín hiệu `purchase = 5.0` vừa lọc bỏ/phạt ở Stage 2; chưa truyền `timestamp` & `eventType` sang `analyze-server`; chưa có cron tính `CoPurchase` trong `src/worker.js`; chưa có endpoint ghi nhận `click_item` và `view_item > 5s`.
- **Hạ tầng Redis**:
  - `docker-compose.yml` hiện chưa chạy container `redis`. Có thể triển khai trước bằng **MySQL + in-memory TTL cache** (hoạt động ngay với stack hiện tại), sau đó gắn thêm `redis:7-alpine` (Sorted Set `ZADD` 20 tương tác gần nhất + Set `purchased_items`) khi cần mở rộng tải.

### 4.2. Kế hoạch tích hợp từng bước (4 điểm chạm chính)

1. **Bước 1 — Frontend (`Ecommerce-platform/frontend`)**:
   - Tại trang danh sách sản phẩm: gửi sự kiện `click_item` (`weight = 1.5`) khi user bấm vào card sản phẩm.
   - Tại trang chi tiết sản phẩm: đặt timer `> 5s` mới ghi nhận `view_item` (`weight = 1.0`), tránh tính nhầm lượt lướt nhanh.
   - Các hành vi `add_to_cart` (`3.0`) và `purchase` (`5.0`) đã có sẵn API backend ghi nhận.

2. **Bước 2 — Thu thập & Tổng hợp hành vi (`Ecommerce-platform/backend`)**:
   - Bổ sung API nhẹ `POST /products/behavior` (hoặc lưu vào `user_viewed_products` / `activity_logs` / Redis Sorted Set) cho `click_item` và `view_item > 5s`.
   - Trong `product.service.js` (`getRecommendedProducts`):
     - Query thêm danh sách sản phẩm đã mua gần đây của `userId` (`db.OrderItem` join `db.ShopOrder` join `db.ParentOrder`, trạng thái không hủy).
     - Đóng gói 20 tương tác gần nhất `{ productId, eventType, timestamp }` cùng `purchasedIds`, `inCartIds`, `viewedOftenIds` gửi sang `analyze-server`.

3. **Bước 3 — Nâng cấp Engine Gợi ý (`analytics-platform/backend`)**:
   - Trong `search.controller.js` (`getRecommendations`): đọc `interactions`, `purchasedIds`, `inCartIds`, `viewedOftenIds`, `filterMode` (`"hard"` | `"soft"`), giữ tương thích ngược khi chỉ nhận `viewedProductIds`.
   - Trong `vectorSearch.service.js`: triển khai `recommendWithBehaviorPipeline` theo đúng 4 bước ($V_{user}$ chuẩn hóa L2 $\rightarrow$ Top-50 Cosine $\rightarrow$ Hard Filter / Soft Penalty $\alpha$ $\rightarrow$ `0.7 * Cosine + 0.3 * CoPurchase`).
   - Thêm route `POST /api/v1/recommendations/co-purchase-sync` để nhận ma trận mua kèm và lưu snapshot ra đĩa (`vector-data/co_purchase_matrix.json`) để tự nạp lại khi `analyze-server` khởi động.

4. **Bước 4 — Batch Job `Co-Purchase` ban đêm (`Ecommerce-platform/backend/src/worker.js`)**:
   - Thêm cron job chạy `02:00 AM` hàng ngày thống kê các cặp sản phẩm `(B, X)` xuất hiện cùng `parent_order_id` (hoặc cùng `user_id` trong 7 ngày), chuẩn hóa điểm về $[0, 1]$ theo từng sản phẩm gốc `B` (giữ Top-20 `X` cho mỗi `B`), rồi `POST` sang `analyze-server`.
   - Kiểm chứng bằng unit test (`node --test`) cho đủ 4 ca: (1) Weight + Time Decay, (2) Hard Filter loại sản phẩm đã mua, (3) Soft Penalty $\alpha = 0.2 / 0.5$ đẩy sản phẩm xuống cuối, (4) `CoPurchase` đẩy sản phẩm mua kèm lên Top-4.

---

## 5. Phần IV — Mục Ưu tiên cần làm tiếp (Next Priorities)

### Ưu tiên 1 (Cao): Buffer 5 phút + Streaming EMA $V_{user}$ (Giảm `INSERT` MySQL)
- **Vấn đề hiện tại**: `POST /products/:id/view` đang ghi trực tiếp vào bảng `user_viewed_products` ngay mỗi lần mở sản phẩm.
- **Giải pháp**:
  1. **Buffer theo phiên trong RAM + Trigger 5 phút (Event-driven)**:
     - Khi có tương tác đầu tiên (`view_item` / `click_item`) và buffer đang rỗng $\rightarrow$ lưu vào buffer RAM của phiên và kích hoạt timer **5 phút**.
     - Khi tới mốc 5 phút (nếu buffer `not empty`): cộng dồn số đếm (`views`, `clicks`) vào DB cho Dashboard (**1 lần ghi / 5 phút** thay vì ghi từng click), cập nhật $V_{user}$, rồi `clear()` mảng.
     - Kết hợp `visibilitychange` + `navigator.sendBeacon` ở Frontend để flush nốt phần buffer còn lại khi user đóng/chuyển tab.
  2. **Streaming EMA $V_{user}$ (chỉ 8 KB / user)**:
     $$V_{user}^{(new)} = \text{Normalize}\Big( (1 - \gamma) \cdot e^{-\lambda \Delta t} \cdot V_{user}^{(old)} + \gamma \cdot V_{\text{batch\_5m}} \Big)$$
     - Lưu duy nhất 1 vector `Float32Array(2048)` cho mỗi user để $V_{user}$ dịch chuyển liên tục trong không gian mà không cần giữ lịch sử dài hạn.
     - Vẫn đọc kết hợp buffer hiện tại khi gọi `GET /products/recommendations` $\rightarrow$ **trang chủ cập nhật tức thì (không phải đợi 5 phút)**; giữ `purchasedIds` từ `order_items` để thực hiện Hard Filter.

### Ưu tiên 2: Kết nối dữ liệu thật cho `analyze-gui` (`:5175`)
- Thay thế dữ liệu mô phỏng trong `analytics-platform/frontend/src/services/analyticsData.ts` bằng API tổng hợp thật (`Overview`, `Funnel`, `RFM`, `Live Events`) lấy từ `ecommerce-server` (hoặc số đếm đã flush mỗi 5 phút).

### Ưu tiên 3: Hoàn thiện Giai đoạn 3 (`Co-Purchase` + `click_item` / `view_item > 5s`)
- Gắn timer `> 5s` cho `view_item` và tracking `click_item` (`1.5`) ở Frontend; triển khai cron job `Co-Purchase` trong `worker.js` + `/api/v1/recommendations/co-purchase-sync`.



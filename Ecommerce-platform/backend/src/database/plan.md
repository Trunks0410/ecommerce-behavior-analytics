# TÀI LIỆU YÊU CẦU: CHUẨN HÓA VÀ TỐI ƯU SCHEMA E-COMMERCE ĐA NHÀ BÁN

## 0. VAI TRÒ VÀ BỐI CẢNH

Bạn là Senior Database Engineer kiêm Backend Engineer, chuyên hệ thống marketplace đa nhà bán.

- Hệ thống: sàn TMĐT gồm 4 vai trò Admin / Vendor / Customer / Shipper.
- CSDL: [MySQL 8 / MariaDB 10.x], schema gốc nằm ở `schema.sql`.
- Backend: [stack, ORM, công cụ migration].
- Hạ tầng: Redis [có/chưa], Queue [có/chưa, loại nào], read replica [có/chưa].
- Quy mô mục tiêu: 1.000+ shop, ~10 triệu đơn, ~30 triệu dòng `order_items`.
- Mục tiêu tổng: xử lý các điểm chưa đạt 3NF theo chiến lược lai. Chuẩn hóa thật sự ở chỗ ít đánh đổi, giữ có kiểm soát ở chỗ cần hiệu năng hoặc cần lưu lịch sử.

## 1. NGUYÊN TẮC CHUNG (ÁP DỤNG CHO MỌI HẠNG MỤC)

1. Phân biệt **SNAPSHOT** (dữ kiện lịch sử tại thời điểm giao dịch, không bao giờ tính lại) với **CACHE** (bản sao phái sinh, bắt buộc có cơ chế đồng bộ và đối soát).
2. Tiền: chính xác trước, nhanh sau. Thống kê hiển thị: nhanh trước, chính xác sau.
3. Mọi thay đổi schema là migration có `up` và `down`. Thứ tự an toàn: thêm cột/bảng mới, backfill, chuyển code sang dùng cái mới, thêm ràng buộc, cuối cùng mới xóa cột cũ (migration riêng, chạy sau khi ổn định).
4. Mọi worker/job idempotent: xử lý lại cùng event cho cùng kết quả.
5. Không tự bịa tên bảng/cột. Thiếu thông tin thì liệt kê câu hỏi và nêu rõ giả định.
6. Không phá vỡ API hiện có. Nếu buộc phải đổi, nêu rõ và đề xuất lớp tương thích tạm.
7. Thay đổi nguy hiểm (xóa cột, ghi đè dữ liệu) phải có bước kiểm tra trước, báo cáo dữ liệu lệch, và backup.

## 2. CẤU TRÚC MỖI HẠNG MỤC

Mỗi hạng mục dưới đây có: **Mục tiêu / Cần kiểm tra trước / Yêu cầu / Ràng buộc / Đầu ra / Nghiệm thu**.

---

## NHÓM A. CỘT PHÁI SINH TRONG CÙNG DÒNG

### Hạng mục 1. `shop_orders.final_amount` thành generated column STORED
- **Mục tiêu:** DB tự tính, không thể lệch, vẫn đọc nhanh và index được.
- **Cần kiểm tra trước:** liệt kê các dòng mà `final_amount` hiện tại khác `subtotal + shipping_fee - discount_amount`; xuất báo cáo (id, giá trị cũ, giá trị đúng, chênh lệch). Kiểm tra giá trị NULL ở các cột nguồn.
- **Yêu cầu:** công thức `ROUND(subtotal + shipping_fee - discount_amount, 2)`, kiểu `DECIMAL(15,2)`. Xử lý dòng lệch theo quyết định của tôi (đề xuất phương án: giữ nguyên báo cáo để đối chiếu, rồi ghi đè theo công thức). Tạo lại index nếu có index cũ trên cột này.
- **Ràng buộc:** bảng lớn nên đánh giá thời gian khóa bảng, dùng `ALGORITHM=INPLACE/INSTANT` nếu được hoặc công cụ online schema change (gh-ost / pt-online-schema-change).
- **Đầu ra:** migration up/down, SQL kiểm tra trước/sau, báo cáo dòng lệch.
- **Nghiệm thu:** mọi dòng thỏa công thức; INSERT/UPDATE trực tiếp vào cột bị DB từ chối; `EXPLAIN` các truy vấn lọc theo cột này vẫn dùng index.

### Hạng mục 2. `shop_orders.commission_amount` thành generated column STORED
- **Mục tiêu:** hoa hồng luôn khớp công thức, không lưu tay.
- **Yêu cầu:** công thức `ROUND(final_amount * commission_rate / 100, 2)`. Lưu ý MySQL: chỉ tham chiếu được generated column đã khai báo trước nó, nên sắp xếp thứ tự thêm cột (`commission_rate` trước, `final_amount`, rồi `commission_amount`).
- **Ràng buộc:** phải làm sau hạng mục 1 và 3.
- **Đầu ra:** migration up/down, báo cáo chênh lệch giữa giá trị cũ và công thức.
- **Nghiệm thu:** `commission_amount` khớp công thức cho 100% dòng; tổng hoa hồng theo shop/ngày không đổi so với trước migration (trừ các dòng lệch đã báo cáo).

### Hạng mục 3. Thêm `shop_orders.commission_rate` (SNAPSHOT)
- **Mục tiêu:** chốt tỉ lệ hoa hồng tại thời điểm đặt hàng; thay đổi cấu hình hoa hồng sau này không ảnh hưởng đơn cũ.
- **Cần kiểm tra trước:** hiện tại tỉ lệ hoa hồng nằm ở đâu (bảng shop, danh mục, cấu hình hệ thống, hay hardcode)? Có cột này chưa?
- **Yêu cầu:** `DECIMAL(5,2) NOT NULL`. Backfill đơn cũ: ưu tiên suy ra từ `commission_amount / final_amount * 100` nếu dữ liệu cũ tin cậy; nếu không, dùng tỉ lệ cấu hình hiện hành và ghi rõ trong báo cáo. Code tạo đơn phải đọc tỉ lệ hiện hành và ghi vào cột này trong cùng transaction tạo đơn.
- **Đầu ra:** migration, đoạn code tạo đơn đã sửa, báo cáo nguồn backfill (bao nhiêu dòng suy ra, bao nhiêu dòng dùng mặc định).
- **Nghiệm thu:** không còn dòng NULL; đổi cấu hình hoa hồng rồi tạo đơn mới thì đơn cũ không đổi.

### Hạng mục 4. Rà soát và gỡ ghi trực tiếp vào `final_amount`, `commission_amount`
- **Mục tiêu:** không còn đường ghi nào (generated column không cho ghi giá trị).
- **Yêu cầu:** tìm toàn bộ INSERT/UPDATE/ORM model/seed/fixture/test/stored procedure/trigger chứa hai cột này; gỡ khỏi payload ghi, giữ lại ở phần đọc.
- **Đầu ra:** danh sách (file, dòng, nội dung cũ, nội dung mới) và diff.
- **Nghiệm thu:** `grep` không còn chỗ ghi; toàn bộ test hiện có chạy xanh; luồng tạo đơn, sửa đơn, áp coupon hoạt động đúng.

---

## NHÓM B. ĐƠN HÀNG VÀ SNAPSHOT

### Hạng mục 5. `parent_orders.total_amount` bất biến
- **Mục tiêu:** tính đúng một lần lúc tạo đơn, sau đó không đổi.
- **Cần kiểm tra trước:** nơi nào đang UPDATE cột này? Nghiệp vụ hủy/trả một phần hiện xử lý ra sao?
- **Yêu cầu:** `total_amount` = tổng `final_amount` của các `shop_orders` con, tính trong transaction tạo đơn. Gỡ mọi hàm cập nhật cột này ở tầng ứng dụng. Thêm trigger `BEFORE UPDATE` chặn thay đổi cột này (`SIGNAL SQLSTATE '45000'`). Hủy/trả một phần không sửa `total_amount`; ghi nhận qua bảng hoàn tiền/điều chỉnh riêng (nêu đề xuất nếu chưa có).
- **Đầu ra:** migration trigger up/down, code sửa, test.
- **Nghiệm thu:** UPDATE trực tiếp bị chặn; `total_amount` luôn bằng tổng các đơn con tại thời điểm tạo; luồng hủy/trả không làm đổi cột này.

### Hạng mục 6. Tài liệu hóa SNAPSHOT
- **Mục tiêu:** ai đọc schema cũng biết cột nào là dữ kiện lịch sử, không "sửa cho đồng bộ" nhầm.
- **Yêu cầu:** thêm `COMMENT` mức cột trong DB và mục trong tài liệu schema cho: `order_items.(product_name, sku, size, color, price)`, `parent_orders.shipping_address`, `shop_orders.commission_rate`. Nội dung: "SNAPSHOT: dữ kiện lịch sử tại thời điểm giao dịch, không đồng bộ ngược với bảng nguồn". Giữ cả `address_id` (tham chiếu/thống kê) và `shipping_address` (bản ghi chính thức của đơn).
- **Đầu ra:** migration `ALTER ... COMMENT`, đoạn tài liệu.
- **Nghiệm thu:** `SHOW FULL COLUMNS` hiển thị comment đúng; tài liệu có bảng liệt kê snapshot.

---

## NHÓM C. VÍ SHOP (ƯU TIÊN CAO NHẤT, LÀM TRƯỚC)

### Hạng mục 7. Bảng `wallet_transactions` (ledger append-only)
- **Yêu cầu cột:** `id BIGINT PK AUTO_INCREMENT`, `shop_id`, `type ENUM('order_income','commission','payout','refund','adjust','opening_balance')`, `amount DECIMAL(15,2)` (dương = cộng, âm = trừ), `balance_after DECIMAL(15,2)`, `ref_type`, `ref_id`, `idempotency_key VARCHAR(100)`, `note`, `created_at`.
- **Ràng buộc:** `UNIQUE (idempotency_key)`; index `(shop_id, created_at)`; FK tới shop; engine InnoDB.
- **Đầu ra:** migration up/down, tài liệu ý nghĩa từng loại `type` và dấu của `amount`.
- **Nghiệm thu:** chèn hai lần cùng `idempotency_key` thì lần hai bị từ chối.

### Hạng mục 8. Service ví duy nhất
- **Mục tiêu:** một cửa duy nhất thay đổi số dư; không còn chỗ nào UPDATE `shop_wallets` trực tiếp.
- **Yêu cầu:** trong MỘT transaction: (1) `SELECT ... FROM shop_wallets WHERE shop_id=? FOR UPDATE`; (2) kiểm tra điều kiện (payout không vượt số dư khả dụng, không để số dư âm); (3) INSERT ledger kèm `balance_after`; (4) UPDATE `balance`, `pending_balance`, `total_earned` tương ứng. Idempotency: gặp khóa trùng thì trả kết quả cũ. Thứ tự khóa nhất quán khi một thao tác chạm nhiều ví (khóa theo `shop_id` tăng dần) để tránh deadlock. Quy định rõ quy tắc chuyển tiền giữa `pending_balance` và `balance` (ví dụ khi đơn hoàn tất).
- **Đầu ra:** module ví (hàm: `credit`, `debit`, `holdPending`, `releasePending`, `payout`, `refund`, `adjust`), code thay thế mọi chỗ ghi ví cũ, danh sách chỗ đã thay.
- **Test bắt buộc:** 100 giao dịch song song lên cùng một ví cho kết quả đúng; lỗi giữa chừng thì rollback toàn bộ (không có ledger mồ côi hay số dư lệch); gọi lại cùng `idempotency_key` không ghi hai lần; payout vượt số dư bị từ chối.
- **Nghiệm thu:** `grep` không còn UPDATE `shop_wallets` ngoài module này; test đồng thời xanh.

### Hạng mục 9. Migrate số dư hiện có thành `opening_balance`
- **Yêu cầu:** với mỗi ví tạo giao dịch `opening_balance` sao cho tổng ledger khớp `shop_wallets.balance`. Chạy theo lô, có thể chạy lại an toàn (không tạo trùng). Báo cáo các ví có `pending_balance`/`total_earned` không thể tái dựng từ lịch sử.
- **Đầu ra:** script migrate, báo cáo ví bất thường.
- **Nghiệm thu:** với mọi shop, `SUM(amount) = shop_wallets.balance`.

### Hạng mục 10. Chặn UPDATE/DELETE trên `wallet_transactions`
- **Yêu cầu:** `REVOKE UPDATE, DELETE` trên bảng này cho user DB của ứng dụng; thêm trigger `BEFORE UPDATE/DELETE` dùng `SIGNAL SQLSTATE '45000'` làm lớp bảo vệ thứ hai. Sửa sai bằng giao dịch `adjust` mới.
- **Đầu ra:** script cấp quyền, trigger, hướng dẫn cho DBA.
- **Nghiệm thu:** user ứng dụng thử UPDATE/DELETE đều thất bại.

### Hạng mục 11. Job đối soát ví hằng đêm
- **Yêu cầu:** so `SUM(amount)` theo shop với `shop_wallets.balance`; chạy theo lô, ưu tiên đọc từ read replica; lệch thì ghi `reconciliation_logs` (action = `alerted`) và gửi cảnh báo [Slack/email]. **Tuyệt đối không tự sửa số dư.** Có kiểm tra thêm: `balance_after` của giao dịch cuối khớp `balance`.
- **Đầu ra:** job, lịch chạy (cron), mẫu thông báo cảnh báo.
- **Nghiệm thu:** cố tình làm lệch một ví trên staging thì job phát hiện và cảnh báo, không sửa.

---

## NHÓM D. BỘ ĐẾM VÀ CACHE

### Hạng mục 12. `products.sold_count` (bất đồng bộ)
- **Mục tiêu:** hiển thị nhanh, không SUM trên `order_items`.
- **Cần chốt trước:** quy ước đơn ở trạng thái nào thì tính vào `sold_count` (đã giao? hoàn tất?) và cách xử lý hủy/trả.
- **Yêu cầu:** phát event `order.completed` (cộng) và `order.cancelled`/`order.returned` (trừ ngược nếu đã cộng) SAU khi transaction commit (outbox pattern nếu cần tin cậy cao). Worker cập nhật theo `order_items.quantity`, dùng bảng `processed_events(event_id UNIQUE)` chống xử lý lặp. Index phục vụ sắp xếp "bán chạy" theo truy vấn thực tế.
- **Đầu ra:** event, worker, migration `processed_events`, index.
- **Nghiệm thu:** phát lại cùng event 5 lần cho kết quả như 1 lần; độ trễ cập nhật chấp nhận được [x giây].

### Hạng mục 13. `products.view_count` (Redis đệm)
- **Yêu cầu:** mỗi lượt xem `INCR product:{id}:views` (cân nhắc chống đếm lặp theo user/IP trong cửa sổ thời gian). Job mỗi 1-5 phút lấy và reset bộ đếm nguyên tử (`RENAME` key hoặc `GETDEL`) để không mất lượt, rồi UPDATE hàng loạt bằng một câu SQL (`UPDATE ... CASE` hoặc bảng tạm + JOIN). Redis lỗi thì bỏ qua việc đếm (fail-open), không làm sập trang sản phẩm.
- **Đầu ra:** middleware đếm, job flush, cấu hình TTL/key.
- **Nghiệm thu:** 10.000 lượt xem song song chỉ gây vài câu UPDATE; tắt Redis thì trang sản phẩm vẫn tải bình thường.

### Hạng mục 14. `shops.rating` thành `rating_sum` + `rating_count`
- **Yêu cầu:** thêm hai cột, backfill từ `product_reviews`. Review thêm: `+x, +1`; sửa: `+(mới - cũ)`; xóa: `-x, -1`; làm trong transaction với thao tác review hoặc qua worker idempotent. `rating` đọc ra là `rating_sum / NULLIF(rating_count, 0)`, có thể là generated column `ROUND(..., 2)`. Cân nhắc làm tương tự cấp sản phẩm nếu danh sách sản phẩm hiển thị rating.
- **Đầu ra:** migration, backfill, code review service, test.
- **Nghiệm thu:** sau chuỗi thêm/sửa/xóa ngẫu nhiên, giá trị khớp `AVG` tính lại từ gốc.

### Hạng mục 15. `coupons.used_count` (atomic)
- **Yêu cầu:** `UPDATE coupons SET used_count = used_count + 1 WHERE id=? AND used_count < usage_limit`; kiểm tra `affected_rows = 1`, bằng 0 thì từ chối áp dụng. Làm trong cùng transaction tạo đơn và ghi `user_coupons`; ràng buộc mỗi user dùng tối đa theo quy định bằng UNIQUE phù hợp. Hủy đơn thì hoàn lại `used_count` và `user_coupons` theo quy tắc nghiệp vụ (nêu giả định).
- **Nghiệm thu:** 500 request đồng thời với coupon giới hạn 100 lượt thì đúng 100 thành công.

### Hạng mục 16. `campaign_products.sold_count` (atomic, chống bán quá flash sale)
- **Yêu cầu:** `UPDATE campaign_products SET sold_count = sold_count + :qty WHERE id=? AND sold_count + :qty <= quota`; kiểm tra `affected_rows`. Hoàn lại khi hủy đơn; xử lý hết hạn giữ chỗ nếu có cơ chế giữ chỗ. Nêu rõ thứ tự trừ tồn kho và trừ quota để tránh trừ một nơi rồi thất bại ở nơi kia (rollback đồng bộ).
- **Nghiệm thu:** test tải nhiều người mua đồng thời, không bao giờ vượt quota.

---

## NHÓM E. HẠ TẦNG HỖ TRỢ

### Hạng mục 17. Redis, Queue, Worker
- **Yêu cầu:** cấu hình Redis và hàng đợi [BullMQ / RabbitMQ / Kafka]. Worker: idempotent, retry với exponential backoff, dead-letter queue, log có correlation id. Chuẩn hóa danh mục event và payload: `order.created`, `order.completed`, `order.cancelled`, `order.returned`, `review.created/updated/deleted`, `product.viewed`. Health check và metric: độ dài queue, độ trễ xử lý, số job lỗi.
- **Đầu ra:** cấu hình, mã worker, tài liệu event (tên, payload, nhà phát, người nhận).
- **Nghiệm thu:** giết worker giữa chừng rồi bật lại, không mất và không nhân đôi số liệu; job lỗi vào DLQ có thể xem và chạy lại.

### Hạng mục 18. Job đối soát đêm và `reconciliation_logs`
- **Yêu cầu:** bảng `reconciliation_logs(id, table_name, record_id, field, old_value, correct_value, action ENUM('fixed','alerted'), created_at)`. Đối soát `products.sold_count` với `order_items` theo quy ước trạng thái; `coupons.used_count` với số đếm thực; `shops.rating_sum/count` với `product_reviews`. Số liệu hiển thị thì tự sửa và ghi log; tiền thì chỉ cảnh báo. Chạy theo lô và giới hạn tốc độ để không gây tải.
- **Nghiệm thu:** làm lệch cố ý trên staging thì job sửa đúng và có log.

---

## NHÓM F. CHUẨN HÓA CÒN LẠI

### Hạng mục 19. `return_requests.user_id`
- **Yêu cầu:** đo tần suất truy vấn "đơn trả hàng của tôi" (slow log/thống kê query) và so sánh chi phí JOIN `shop_orders → parent_orders` với đọc trực tiếp cột. Quyết định có căn cứ: ít dùng thì bỏ cột; dùng nhiều thì giữ kèm đảm bảo nhất quán (kiểm tra ở tầng ứng dụng khi tạo, hoặc composite FK).
- **Đầu ra:** số liệu đo, lý do chọn, migration hoặc đoạn kiểm tra nhất quán, truy vấn phát hiện dòng đã lệch.
- **Nghiệm thu:** không còn dòng có `user_id` khác chủ đơn thực tế.

### Hạng mục 20. `activity_logs.email`
- **Yêu cầu:** giữ nguyên, thêm `COMMENT`: "SNAPSHOT: email tại thời điểm hành động; log phải còn nguyên dù tài khoản đổi email hoặc bị xóa".
- **Nghiệm thu:** comment và tài liệu đã cập nhật.

### Hạng mục 21. Tách `user_profiles.shipper_shop_id`
- **Yêu cầu:** tạo `shipper_profiles(user_id PK/FK, shipper_shop_id FK, created_at)`. Migrate cho user có role `shipper`; cập nhật toàn bộ code đọc/ghi; giai đoạn chuyển tiếp ghi cả hai nơi nếu cần; cuối cùng DROP cột khỏi `user_profiles`.
- **Nghiệm thu:** không còn code tham chiếu cột cũ; mọi shipper có đúng một dòng hồ sơ.

### Hạng mục 22. Tách `user_profiles.operating_areas` (JSON)
- **Yêu cầu:** tạo `shipper_operating_areas(id, shipper_id FK, province, district)` với `UNIQUE (shipper_id, province, district)` và index phục vụ "shipper phụ trách khu vực X". Parse JSON cũ để migrate; báo cáo bản ghi sai định dạng; chuẩn hóa tên tỉnh/quận theo danh mục chuẩn nếu có; cập nhật code; DROP cột cũ.
- **Nghiệm thu:** số khu vực sau migrate khớp số phần tử JSON hợp lệ; truy vấn theo khu vực dùng index.

### Hạng mục 23. Tách `return_requests.evidence_urls`
- **Yêu cầu:** tạo `return_evidence_media(id, return_request_id FK, media_url, media_type ENUM('image','video'), sort_order, created_at)`. Migrate từ mảng JSON/TEXT; cập nhật code upload và hiển thị; DROP cột cũ.
- **Nghiệm thu:** số media sau migrate khớp số URL hợp lệ ban đầu; thứ tự hiển thị giữ nguyên.

---

## NHÓM G. TÀI LIỆU

### Hạng mục 24. Cập nhật tài liệu schema
- **Yêu cầu:** đánh dấu mỗi cột phi chuẩn hóa là `SNAPSHOT` hoặc `CACHE`. Với `CACHE`: nguồn dữ liệu, cơ chế đồng bộ (đồng bộ/bất đồng bộ), độ trễ chấp nhận, job đối soát tương ứng. Xuất bảng tổng hợp: cột, loại, lý do giữ, cách đồng bộ, người chịu trách nhiệm.
- **Nghiệm thu:** mọi cột đã xử lý trong tài liệu này đều có mặt trong bảng tổng hợp.

---

## 3. THỨ TỰ THỰC HIỆN

1. Nhóm C (ví), nhóm A (generated column), hạng mục 15-16 (atomic coupon/flash sale).
2. Hạng mục 17, 12-14, 18 (hạ tầng bất đồng bộ, cache, đối soát).
3. Hạng mục 5-6, 19-23 (chuẩn hóa còn lại).
4. Hạng mục 24 (cập nhật xuyên suốt, chốt cuối).

Mỗi nhóm xong và tự kiểm tra xong mới sang nhóm tiếp theo.

## 4. ĐỊNH DẠNG ĐẦU RA CHO MỖI HẠNG MỤC

1. Câu hỏi và giả định (nếu có).
2. Migration SQL `up` và `down`, kèm câu lệnh kiểm tra trước/sau.
3. Thay đổi code: đường dẫn file và đoạn code đầy đủ (không viết tắt "...").
4. Test: unit, đồng thời, tích hợp.
5. Rủi ro và cách rollback.
6. Checklist nghiệm thu có thể tick.

Cuối cùng cung cấp: danh sách file thay đổi/tạo mới, thứ tự và lệnh chạy migration, kế hoạch triển khai an toàn (chạy song song cách cũ và mới, so sánh kết quả, bật bằng feature flag, rồi chuyển hẳn), khuyến nghị index và đo hiệu năng trước/sau (`EXPLAIN`, p95/p99).

## 5. TIÊU CHÍ NGHIỆM THU CHUNG

- Không còn đường ghi nào vào `final_amount`, `commission_amount`; giá trị luôn khớp công thức.
- Mọi shop: `SUM(wallet_transactions.amount) = shop_wallets.balance`; user ứng dụng không thể UPDATE/DELETE ledger.
- Coupon và flash sale không bao giờ vượt giới hạn trong test đồng thời; ví không âm, không lệch.
- Worker xử lý lặp cùng event cho cùng kết quả.
- Mọi migration có `down` hoạt động, đã thử trên bản sao dữ liệu lớn.
- Dashboard và danh sách sản phẩm không còn `SUM/AVG/COUNT` quét bảng lớn trong đường đọc nóng.
- Tài liệu schema phản ánh đúng thực tế.

## 6. CÁCH BẮT ĐẦU

Đọc `schema.sql` và mã nguồn liên quan, sau đó trả về: (1) danh sách câu hỏi cần làm rõ, (2) bảng ánh xạ hạng mục → bảng/cột/file thực tế, (3) kế hoạch chi tiết. Chờ tôi xác nhận trước khi viết migration cho các hạng mục rủi ro cao (nhóm C, hạng mục 21-23). Các hạng mục rủi ro thấp có thể làm ngay và trình bày kết quả.

---

## 7. DANH SÁCH CÁC SERVICE VÀ TỆP TIN CHỊU ẢNH HƯỞNG (CẦN UPDATE SAU)

Dưới đây là tài liệu phân rã chi tiết toàn bộ các module backend (services, controllers, models, background workers) chịu ảnh hưởng trực tiếp bởi các thay đổi schema theo chiến lược lai (Hybrid 3NF & Optimization). Danh sách này đóng vai trò bản đồ thực thi (execution roadmap) cho giai đoạn refactor mã nguồn sau khi hoàn thiện schema:

### 7.1. Nhóm Dịch Vụ Nghiệp Vụ Cốt Lõi (Core Business Services)

#### 1. `order.service.js` ([src/modules/order/order.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/order/order.service.js)) — **RỦI RO CAO / ƯU TIÊN 1**
* **Hạng mục 1, 2 & 4 (Generated Columns: `final_amount`, `commission_amount`):**
  * Trong hàm `createOrder`:
    * Tính toán `discount_amount = Number(shop.shop_discount || 0) + Number(shopGlobalDiscount || 0)` (tổng chiết khấu từ shop voucher + phân bổ voucher sàn/điểm thưởng) để đảm bảo ràng buộc công thức DB `ROUND(subtotal + shipping_fee - discount_amount, 2)` khớp chính xác với `final_amount`.
    * **Loại bỏ hoàn toàn** `final_amount` và `commission_amount` khỏi payload truyền vào `db.ShopOrder.create({...})`. MySQL 8 STORED generated column sẽ tự động tính toán, nếu cố tình ghi giá trị sẽ gây lỗi fatal.
    * Khi cần trả về dữ liệu đơn hàng cho response hoặc socket event ngay sau khi tạo, dùng biến tính toán tạm hoặc gọi `await shopOrder.reload({ transaction })`.
* **Hạng mục 3 (Snapshot `commission_rate`):**
  * Đọc tỉ lệ hoa hồng hiện hành của Shop (hoặc cấu hình hệ thống), gán giá trị vào `commission_rate` trong payload `db.ShopOrder.create({...})` (ví dụ: `commission_rate: shop.commission_rate || 5.00`).
* **Hạng mục 5 (Bất biến `parent_orders.total_amount`):**
  * `parent_orders.total_amount` được chốt duy nhất 1 lần trong transaction tạo đơn cha = tổng `final_amount` các đơn con.
  * Gỡ bỏ mọi logic cập nhật lại cột này ở các luồng sau. Khi hủy đơn hoặc hoàn tiền một phần, giữ nguyên `total_amount` và ghi nhận trạng thái qua `refund_amount` hoặc bảng hoàn tiền riêng.
* **Hạng mục 8 (Tích hợp Service Ví Duy Nhất `walletService`):**
  * **Trạng thái SHIPPING (dòng ~794-798):** Gỡ bỏ `wallet.increment('pending_balance', ...)`. Thay thế bằng:
    ```javascript
    await walletService.holdPending({
      shopId: order.shop_id,
      amount: netEarning,
      type: 'order_income',
      refType: 'shop_orders',
      refId: order.id,
      idempotencyKey: `order_shipping_${order.id}`,
      note: `Tạm giữ doanh thu đơn hàng #${order.shop_order_code}`
    }, transaction);
    ```
  * **Trạng thái DELIVERED (dòng ~820-829):** Gỡ bỏ `wallet.update({ pending_balance, balance, total_earned })`. Thay thế bằng:
    ```javascript
    await walletService.releasePending({
      shopId: order.shop_id,
      amount: netEarning,
      type: 'order_income',
      refType: 'shop_orders',
      refId: order.id,
      idempotencyKey: `order_delivered_${order.id}`,
      note: `Ghi nhận thực nhận đơn hàng #${order.shop_order_code}`
    }, transaction);
    ```
  * **Trạng thái CANCELLED / REFUND (dòng ~890):** Gỡ bỏ can thiệp ví tùy tiện, chuyển sang gọi `walletService.refund(...)` hoặc `walletService.releasePending(...)` để hủy khoản giữ.
* **Hạng mục 12 (Cache `products.sold_count` bất đồng bộ):**
  * Không tăng/giảm đồng bộ `sold_count` trên MySQL trong quá trình tạo đơn; chuyển sang phát event `order.completed` hoặc đưa vào queue BullMQ sau khi transaction commit thành công.
* **Hạng mục 15 & 16 (Atomic counters cho Coupon & Flash Sale):**
  * Áp dụng Coupon (dòng ~434): Thay vì đọc JS rồi mới gọi `increment`, chuyển sang câu lệnh atomic có kiểm tra:
    ```sql
    UPDATE coupons SET used_count = used_count + 1 WHERE id = :couponId AND used_count < usage_limit;
    ```
    Kiểm tra `affectedRows === 0` thì throw Error ("Mã giảm giá đã hết lượt sử dụng").
  * Mua hàng Flash Sale: Thay thế câu lệnh cập nhật `campaign_products.sold_count` bằng atomic update:
    ```sql
    UPDATE campaign_products SET sold_count = sold_count + :qty WHERE id = :id AND (quantity_limit IS NULL OR sold_count + :qty <= quantity_limit);
    ```
* **Hạng mục 22 (Chuẩn hóa khu vực phân công Shipper):**
  * Trong hàm `autoAssignShipper` (dòng ~665-675): Loại bỏ `JSON.parse(shipper.profile?.operating_areas)`. Chuyển sang truy vấn trực tiếp bảng `shipper_operating_areas` bằng SQL JOIN hoặc Sequelize `include` có `where: { province, district }`.

---

#### 2. `shop.service.js` ([src/modules/shop/shop.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/shop/shop.service.js)) — **RỦI RO CAO / ƯU TIÊN 1**
* **Hạng mục 8 (Rút tiền Shop - Payout):**
  * Trong hàm `requestPayout` (dòng ~650-695):
    * Hiện tại đang gọi trực tiếp `wallet.decrement('balance', { by: amt, transaction })` mà không dùng khóa bi quan và không ghi sổ cái.
    * Refactor chuyển sang gọi qua `walletService.debit(...)` hoặc `walletService.holdForPayout(...)` với khóa dòng `SELECT ... FOR UPDATE`, ghi nhận dòng ledger `wallet_transactions` mang `type = 'payout'`, `amount = -amt`, `ref_type = 'shop_payouts'`, `ref_id = payout.id`, `idempotencyKey = 'payout_request_${payout.id}'`.
* **Hạng mục 7 & 8 (Báo cáo tài chính gian hàng):**
  * Trong hàm `getShopFinancials` (dòng ~210-232):
    * Bổ sung API/dữ liệu truy vấn sổ cái `wallet_transactions` theo `shop_id` có phân trang, giúp Vendor đối soát từng dòng tiền (đơn hàng nào, hoa hồng bao nhiêu, rút tiền lúc nào, số dư sau giao dịch).

---

#### 3. `return.service.js` ([src/modules/return/return.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/return/return.service.js)) — **RỦI RO CAO / ƯU TIÊN 1**
* **Hạng mục 8 (Kiểm soát đóng băng & giải phóng tiền khi Đổi / Trả hàng):**
  * **Tạo yêu cầu trả hàng (`createReturnRequest`, dòng ~100-107):** Hiện tại đang trừ `balance` và cộng `pending_balance` thủ công bằng JS. Cần refactor gọi:
    ```javascript
    await walletService.holdPending({
      shopId: order.shop_id,
      amount: amountToFreeze,
      type: 'refund',
      refType: 'return_requests',
      refId: returnRequest.id,
      idempotencyKey: `return_freeze_${returnRequest.id}`,
      note: `Tạm đóng băng tiền chờ giải quyết khiếu nại trả hàng #${returnRequest.id}`
    }, transaction);
    ```
  * **Từ chối yêu cầu trả hàng (`rejectReturnRequest`, dòng ~531-537):** Hiện tại đang hoàn lại `pending_balance` về `balance` thủ công. Cần refactor chuyển sang gọi `walletService.releasePending(...)` để giải phóng khoản tiền đóng băng.
  * **Duyệt hoàn tiền cho khách (`processRefund`, dòng ~628-666):** Hiện tại đang can thiệp trực tiếp `shopWallet.balance` và `total_earned`. Cần chuyển sang gọi `walletService.refund(...)` để khấu trừ vĩnh viễn và ghi ledger kiểm toán.
* **Hạng mục 23 (Chuẩn hóa danh sách URL bằng chứng đổi trả):**
  * Trong hàm `createReturnRequest` (dòng ~68): Thay vì lưu mảng `evidenceUrls` dưới dạng chuỗi JSON vào cột `TEXT`, duyệt mảng và chèn các dòng vào bảng mới `return_evidence_media(return_request_id, media_url, media_type, sort_order)`.
  * Trong các hàm lấy chi tiết đơn đổi trả: Eager load `ReturnEvidenceMedia` (thay vì tự `JSON.parse` chuỗi TEXT).

---

#### 4. `admin.service.js` ([src/modules/admin/admin.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/admin/admin.service.js)) — **RỦI RO CAO / ƯU TIÊN 2**
* **Hạng mục 8 (Giải ngân và duyệt/từ chối rút tiền):**
  * Hàm `disburseShopWallet(shopId)` (dòng ~1084-1105): Thay thế việc sửa trực tiếp `wallet.balance` bằng hàm `walletService.payout(...)`.
  * Hàm `approveShopPayout` (dòng ~1108-1125): Đánh dấu hoàn tất yêu cầu payout, xác nhận đối soát trạng thái ledger.
  * Hàm `rejectShopPayout` (dòng ~1194-1242): Dòng ~1210-1218 đang tự ý `wallet.update({ balance: currentBalance + refundAmount })` mà không có nhật ký giao dịch. Chuyển sang gọi:
    ```javascript
    await walletService.credit({
      shopId: payout.shop_id,
      amount: payout.amount,
      type: 'adjust',
      refType: 'shop_payouts',
      refId: payout.id,
      idempotencyKey: `payout_rejected_refund_${payout.id}`,
      note: `Hoàn tiền yêu cầu rút tiền bị từ chối: ${reason}`
    }, transaction);
    ```
* **Hạng mục 21 & 22 (Quản lý tài khoản Shipper):**
  * Hàm `createUser` (dòng ~11-75): Khi tạo tài khoản có `role = 'shipper'`, không ghi `shipper_shop_id` vào `user_profiles` mà tạo bản ghi trong `shipper_profiles`.
  * Hàm `getUsers` và `getUserDetail` (dòng ~136, ~255): JOIN với `shipper_profiles` và `shipper_operating_areas` khi query thông tin shipper.

---

#### 5. `shipper.service.js` ([src/modules/shipper/shipper.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/shipper/shipper.service.js)) — **TRUNG BÌNH**
* **Hạng mục 1 & 4 (Đọc dữ liệu đơn hàng & đối soát COD):**
  * Hàm `getCollectedCOD` và `getReconciliationHistory`: Các truy vấn đọc `ShopOrder.final_amount` và `cod_amount_collected` vẫn hoạt động bình thường qua SELECT, nhưng cần lưu ý không phát sinh câu lệnh INSERT/UPDATE chứa `final_amount`.
* **Hạng mục 21 & 22 (Hồ sơ Shipper & Tuyến vận chuyển):**
  * Khi shipper lấy danh sách đơn hoặc nhận tuyến giao: Đọc khu vực phụ trách từ bảng `shipper_operating_areas` thay vì đọc JSON profile.

---

#### 6. `manager.service.js` ([src/modules/manager/manager.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/manager/manager.service.js)) — **TRUNG BÌNH**
* **Hạng mục 1, 2 & 8 (Tối ưu hóa Báo Cáo Tài Chính):**
  * Hàm `getFinancialReports` (dòng ~465-525): Đang tính toán doanh thu/hoa hồng/số dư bằng cách lặp và tính nhẩm trên mảng in-memory:
    `const commissionAmount = commissionMap[shop.id] || (grossRevenue * 0.1);`
    `const availableBalance = Math.max(0, netRevenue - paidPayout - pendingPayout);`
    Refactor chuyển sang đọc trực tiếp từ `ShopWallet` và đối chiếu với bảng tổng hợp `wallet_transactions` để báo cáo tài chính luôn có số liệu kiểm toán chính xác tuyệt đối.
* **Hạng mục 12 (Tối ưu truy vấn Top Sản Phẩm Bán Chạy / Bán Ế):**
  * Dòng ~538+: Hiện tại đang load toàn bộ `OrderItem` vào bộ nhớ Node.js để tính doanh số từng sản phẩm. Refactor chuyển sang query trực tiếp trên cột cache `products.sold_count` đã được đánh chỉ mục.

---

#### 7. `user.service.js` & `user.controller.js` ([src/modules/user/](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/user/)) — **TRUNG BÌNH**
* **Hạng mục 21 (Tách hồ sơ Shipper `shipper_profiles`):**
  * Trong `updateProfile`: Khi cập nhật `shipper_shop_id`, cập nhật vào bảng quan hệ `shipper_profiles` thay vì `user_profiles`.
* **Hạng mục 22 (Tách khu vực hoạt động `shipper_operating_areas`):**
  * Trong `user.controller.js` (dòng ~35-41) và `user.service.js` (dòng ~56, ~70): Bỏ logic parse JSON chuỗi `operating_areas`.
  * Nhận mảng `[{ province, district }]` từ request body và thực hiện batch sync (xóa cũ/thêm mới hoặc upsert) vào bảng `shipper_operating_areas`.
  * Trong `getProfile`: JOIN với 2 bảng mới để định dạng response JSON trả về cho Frontend, đảm bảo 100% backward compatibility (không làm hỏng giao diện người dùng).

---

#### 8. `review.service.js` ([src/modules/review/review.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/review/review.service.js)) — **TRUNG BÌNH**
* **Hạng mục 14 (Cache rating Shop nguyên tử: `rating_sum` + `rating_count`):**
  * Hiện tại trong `review.service.js`, `Shop.rating` hoàn toàn không được cập nhật khi có review mới.
  * Trong `createReview` (dòng ~30-45): Bổ sung vào trong transaction:
    ```javascript
    const product = await Product.findByPk(productId, { attributes: ['shop_id'], transaction });
    if (product) {
      await db.sequelize.query(`
        UPDATE shops 
        SET rating_sum = rating_sum + :rating,
            rating_count = rating_count + 1,
            rating = ROUND((rating_sum + :rating) / (rating_count + 1), 2)
        WHERE id = :shopId
      `, { replacements: { rating, shopId: product.shop_id }, transaction });
    }
    ```
  * Trong `updateReview` (dòng ~73-81): Tính toán mức chênh lệch `delta = newRating - oldRating`:
    ```sql
    UPDATE shops 
    SET rating_sum = rating_sum + :delta,
        rating = ROUND((rating_sum + :delta) / NULLIF(rating_count, 0), 2)
    WHERE id = :shopId;
    ```
  * Bổ sung hàm `deleteReview`: Trừ `rating_sum -= rating`, `rating_count -= 1`.

---

#### 9. `product.service.js` ([src/modules/product/product.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/product/product.service.js)) — **TRUNG BÌNH**
* **Hạng mục 13 (Đệm lượt xem qua Redis Buffer):**
  * **Dòng ~219-220 (`getProductDetail`) & Dòng ~506-507 (`trackProductView`):**
    Hiện tại cả 2 vị trí đều đang chạy trực tiếp:
    `await product.increment("view_count", { by: 1 });`
    `await db.Product.increment('view_count', { by: 1, where: { id: productId } });`
    Mỗi lượt xem sản phẩm đều ghi trực tiếp vào MySQL gây nghẽn I/O khi có flash sale hoặc traffic tăng đột biến.
  * **Giải pháp refactor:**
    * Chuyển sang ghi tăng bộ đếm trên Redis: `await redis.incr(`product:${productId}:views`)`.
    * Cài đặt cơ chế Fail-Open: Bọc trong khối `try...catch`, nếu Redis gặp sự cố kết nối thì bỏ qua đếm lượt xem (fail-open) mà không làm sập trang hiển thị sản phẩm.

---

#### 10. `coupon.service.js` ([src/modules/coupon/coupon.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/coupon/coupon.service.js)) — **THẤP**
* **Hạng mục 15 (Atomic used_count):**
  * Trong các hàm kiểm tra mã coupon khả dụng: Sử dụng atomic update hoặc lock FOR UPDATE khi người dùng tiến hành giữ mã trong checkout.

---

### 7.2. Module Dịch Vụ Mới Cần Xây Dựng (New Core Services)

#### 11. `wallet.service.js` ([src/modules/wallet/wallet.service.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/modules/wallet/wallet.service.js)) — **MỚI / ƯU TIÊN CAO NHẤT**
Module cốt lõi đóng vai trò "cửa ngõ duy nhất" (Single Point of Entry) chịu trách nhiệm mọi biến động số dư của toàn bộ hệ thống gian hàng:
* **Các phương thức nghiệp vụ:**
  * `credit({ shopId, amount, type, refType, refId, idempotencyKey, note }, transaction)`: Cộng tiền khả dụng `balance` và `total_earned`.
  * `debit({ shopId, amount, type, refType, refId, idempotencyKey, note }, transaction)`: Trừ tiền khả dụng `balance` (kiểm tra không cho âm).
  * `holdPending({ shopId, amount, type, refType, refId, idempotencyKey, note }, transaction)`: Tăng `pending_balance` (hoặc chuyển từ `balance` sang `pending_balance` khi khiếu nại).
  * `releasePending({ shopId, amount, type, refType, refId, idempotencyKey, note }, transaction)`: Trừ `pending_balance` và chuyển sang `balance` khả dụng.
  * `payout({ shopId, amount, payoutId, idempotencyKey }, transaction)`: Xử lý giải ngân rút tiền.
  * `refund({ shopId, amount, refType, refId, idempotencyKey, note }, transaction)`: Khấu trừ tiền hoàn trả.
* **Quy chuẩn kỹ thuật bắt buộc:**
  1. Mọi hàm biến động tiền tệ bắt buộc chạy trong transaction.
  2. Bắt buộc khóa dòng với thứ tự nhất quán: `SELECT ... FROM shop_wallets WHERE shop_id = :shopId FOR UPDATE` (nếu thao tác chạm nhiều ví thì sắp xếp `shop_id` tăng dần để loại trừ hoàn toàn deadlock).
  3. Bắt buộc kiểm tra `idempotencyKey` trong bảng `wallet_transactions`; nếu đã tồn tại thì trả về kết quả trước đó, tuyệt đối không trừ/cộng 2 lần.
  4. Ghi bản ghi sổ cái `wallet_transactions` kèm giá trị số dư sau giao dịch `balance_after` trước khi commit transaction.

---

### 7.3. Các Sequelize Models Cần Cập Nhật / Tạo Mới (Database Models)

* **Models Cần Cập Nhật:**
  * `ShopOrder.js` ([src/database/models/ShopOrder.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/database/models/ShopOrder.js)): Đánh dấu `final_amount` và `commission_amount` là read-only (không require trong validation khi tạo mới). Bổ sung `commission_rate`.
  * `Shop.js` ([src/database/models/Shop.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/database/models/Shop.js)): Bổ sung 2 trường `rating_sum`, `rating_count`. Thiết lập quan hệ `Shop.hasMany(models.WalletTransaction, { foreignKey: 'shop_id', as: 'walletTransactions' })`.
  * `UserProfile.js` ([src/database/models/UserProfile.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/database/models/UserProfile.js)): Thêm chú thích deprecated cho `shipper_shop_id` và `operating_areas`.
  * `ReturnRequest.js` ([src/database/models/ReturnRequest.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/database/models/ReturnRequest.js)): Thiết lập quan hệ `ReturnRequest.hasMany(models.ReturnEvidenceMedia, { foreignKey: 'return_request_id', as: 'evidenceMedia' })`.
  * `ShopPayout.js` ([src/database/models/ShopPayout.js](file:///e:/ecommerce-behavior-analytics/Ecommerce-platform/backend/src/database/models/ShopPayout.js)): Bổ sung liên kết với transaction ledger.
* **Models Cần Tạo Mới:**
  * `WalletTransaction.js`: Đại diện bảng sổ cái `wallet_transactions`.
  * `ReconciliationLog.js`: Đại diện bảng nhật ký đối soát `reconciliation_logs`.
  * `ShipperProfile.js`: Đại diện bảng hồ sơ shipper `shipper_profiles`.
  * `ShipperOperatingArea.js`: Đại diện bảng khu vực hoạt động `shipper_operating_areas`.
  * `ReturnEvidenceMedia.js`: Đại diện bảng bằng chứng đổi trả `return_evidence_media`.

---

### 7.4. Các Background Jobs & Workers Cần Xây Dựng (Scheduled Tasks & Queues)

* **Job 1: `walletReconciliationJob.js` (Hạng mục 11 — Audit Ví Ban Đêm):**
  * Lịch chạy: 02:00 sáng mỗi ngày.
  * Nhiệm vụ: Duyệt toàn bộ Shop, tính `SUM(amount)` từ `wallet_transactions` và so sánh với `shop_wallets.balance`. So sánh `balance_after` của dòng cuối cùng với `balance` hiện tại.
  * Nếu phát hiện bất kỳ sai lệch nào: Ghi bản ghi vào `reconciliation_logs` với `action = 'alerted'` và kích hoạt cảnh báo khẩn cấp tới Telegram/Slack/Email của ban quản trị. **Tuyệt đối không tự động sửa số dư ví.**
* **Job 2: `viewCountFlushJob.js` (Hạng mục 13 — Xả Bộ Đếm Lượt Xem):**
  * Lịch chạy: Mỗi 2 - 5 phút một lần.
  * Nhiệm vụ: Sử dụng lệnh Redis nguyên tử (`RENAME` key hoặc `GETDEL`) để rút toàn bộ dữ liệu lượt xem đã tích lũy trong Redis, sau đó thực thi một câu lệnh batch SQL `UPDATE products SET view_count = view_count + ...` duy nhất vào MySQL.
* **Job 3: `cacheReconciliationJob.js` (Hạng mục 18 — Đối Soát Cache Hiển Thị):**
  * Lịch chạy: 03:00 sáng mỗi ngày.
  * Nhiệm vụ:
    * Tính lại `sold_count` thực tế từ các đơn thành công trong `order_items` và so khớp với `products.sold_count`.
    * Tính lại `used_count` từ `user_coupons` và so khớp với `coupons.used_count`.
    * Tính lại `rating_sum` và `rating_count` từ `product_reviews` và so khớp với `shops.rating_sum/rating_count`.
    * Tự động điều chỉnh cache hiển thị khớp với dữ liệu gốc và ghi nhật ký vào `reconciliation_logs` với `action = 'fixed'`.

---

### 7.5. Lộ Trình Triển Khai Sau Khi Cập Nhật Schema (Execution Order)

1. **Giai đoạn 1 (Critical Core):**
   * Xây dựng model `WalletTransaction.js` & dịch vụ trung tâm `wallet.service.js`.
   * Refactor luồng tiền trong `order.service.js`, `shop.service.js`, `return.service.js`, `admin.service.js` qua `wallet.service.js`.
2. **Giai đoạn 2 (Generated Columns & Snapshots):**
   * Điều chỉnh model `ShopOrder.js` (đánh dấu generated columns).
   * Refactor payload tạo đơn trong `order.service.js` (gỡ `final_amount`, `commission_amount`, chốt `discount_amount`, snapshot `commission_rate`).
3. **Giai đoạn 3 (1NF Normalization):**
   * Xây dựng models `ShipperProfile.js`, `ShipperOperatingArea.js`, `ReturnEvidenceMedia.js`.
   * Refactor `admin.service.js`, `user.service.js`, `order.service.js` (auto assign), `return.service.js` (upload media).
4. **Giai đoạn 4 (Atomic Counters & Async Caching):**
   * Cập nhật atomic update cho coupon & flash sale trong `order.service.js`.
   * Tích hợp Redis buffer cho lượt xem trong `product.service.js`.
   * Bổ sung tính toán rating nguyên tử trong `review.service.js`.
5. **Giai đoạn 5 (Background Workers):**
   * Viết 3 cron jobs: `walletReconciliationJob`, `viewCountFlushJob`, `cacheReconciliationJob`.
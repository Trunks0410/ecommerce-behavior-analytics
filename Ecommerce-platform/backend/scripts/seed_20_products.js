import db from '../src/database/models/index.js';

async function seed20Products() {
  try {
    console.log('--- Starting Seeding 20 General E-commerce Products ---');

    const passwordHash = '$2a$10$QpjVx0AgqVY5K/2uC8KjX.KRurv.s8c2b/lU3w0wJXb0wYubk5H7G';

    await db.Role.bulkCreate([
      { id: 1, role_name: 'admin' },
      { id: 2, role_name: 'manager' },
      { id: 3, role_name: 'vendor' },
      { id: 4, role_name: 'shipper' },
      { id: 5, role_name: 'user' }
    ], { ignoreDuplicates: true });

    await db.User.bulkCreate([
      { id: 1, role_id: 1, email: 'admin@meemart.com', phone: '0100000001', password: passwordHash, status: 'ACTIVE' },
      { id: 2, role_id: 3, email: 'techmart@meemart.com', phone: '0200000002', password: passwordHash, status: 'ACTIVE' },
      { id: 3, role_id: 3, email: 'homeplus@meemart.com', phone: '0300000003', password: passwordHash, status: 'ACTIVE' },
      { id: 4, role_id: 4, email: 'shipper1@meemart.com', phone: '0400000004', password: passwordHash, status: 'ACTIVE' },
      { id: 5, role_id: 5, email: 'customer@meemart.com', phone: '0500000005', password: passwordHash, status: 'ACTIVE' }
    ], { ignoreDuplicates: true });

    await db.UserProfile.bulkCreate([
      { user_id: 1, full_name: 'Super Admin', gender: 'MALE' },
      { user_id: 2, full_name: 'TechMart Store', gender: 'OTHER' },
      { user_id: 3, full_name: 'HomePlus Store', gender: 'OTHER' },
      { user_id: 4, full_name: 'Shipper Giao Hàng Nhanh', gender: 'MALE' },
      { user_id: 5, full_name: 'Khách Hàng Vip', gender: 'FEMALE' }
    ], { ignoreDuplicates: true });

    await db.Shop.bulkCreate([
      { id: 1, vendor_id: 2, shop_name: 'TechMart', description: 'Gian hàng điện tử & công nghệ', status: 'APPROVED', rating: 4.8 },
      { id: 2, vendor_id: 3, shop_name: 'HomePlus', description: 'Gian hàng gia dụng & thiết bị gia đình', status: 'APPROVED', rating: 4.9 }
    ], { ignoreDuplicates: true });

    await db.Category.bulkCreate([
      { id: 1, name: 'Điện tử', slug: 'dien-tu', parent_id: null, is_active: 1 },
      { id: 2, name: 'Laptop & PC', slug: 'laptop-pc', parent_id: 1, is_active: 1 },
      { id: 3, name: 'Điện thoại', slug: 'dien-thoai', parent_id: 1, is_active: 1 },
      { id: 4, name: 'Âm thanh', slug: 'am-thanh', parent_id: 1, is_active: 1 },
      { id: 5, name: 'Gia dụng', slug: 'gia-dung', parent_id: null, is_active: 1 },
      { id: 6, name: 'Nhà bếp', slug: 'nha-bep', parent_id: 5, is_active: 1 },
      { id: 7, name: 'Sức khỏe & Làm đẹp', slug: 'suc-khoe-lam-dep', parent_id: 5, is_active: 1 },
      { id: 8, name: 'Phụ kiện', slug: 'phu-kien', parent_id: null, is_active: 1 },
      { id: 9, name: 'Smart home', slug: 'smart-home', parent_id: 8, is_active: 1 },
      { id: 10, name: 'Thiết bị văn phòng', slug: 'thiet-bi-van-phong', parent_id: 8, is_active: 1 },
      { id: 11, name: 'Đồng hồ', slug: 'dong-ho', parent_id: 8, is_active: 1 },
      { id: 12, name: 'Máy ảnh', slug: 'may-anh', parent_id: 1, is_active: 1 },
      { id: 13, name: 'Mẹ & Bé', slug: 'me-be', parent_id: null, is_active: 1 },
      { id: 14, name: 'Khuyến mãi', slug: 'khuyen-mai', parent_id: null, is_active: 1 }
    ], { ignoreDuplicates: true });

    const productsData = [
      {
        id: 17,
        shop_id: 2,
        category_id: 7,
        name: 'Laptop ASUS Vivobook 15',
        slug: 'laptop-asus-vivobook-15',
        description: 'Laptop mỏng nhẹ cho công việc học tập, làm việc và giải trí với màn hình 15.6 inch rõ nét.',
        price: 16990000,
        sale_price: 14990000,
        sold_count: 48,
        view_count: 320,
        is_new: true,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Nhôm cao cấp',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800', is_primary: true, sort_order: 1 },
          { image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800', is_primary: false, sort_order: 2 }
        ],
        variants: [
          { sku: 'LAP-ASUS-15-16', size: '15.6 inch', color: 'Bạc', color_hex: '#DADADA', price: 14990000, stock_quantity: 18 },
          { sku: 'LAP-ASUS-15-32', size: '15.6 inch', color: 'Đen', color_hex: '#222222', price: 14990000, stock_quantity: 14 }
        ]
      },
      {
        id: 18,
        shop_id: 2,
        category_id: 5,
        name: 'Tai nghe Bluetooth Sony WH-1000XM5',
        slug: 'tai-nghe-bluetooth-sony-wh-1000xm5',
        description: 'Tai nghe chống ồn chủ động, âm thanh sắc nét, pin bền và phù hợp cho làm việc và nghe nhạc.',
        price: 7990000,
        sale_price: 6990000,
        sold_count: 26,
        view_count: 195,
        is_new: true,
        is_featured: false,
        gender: 'UNISEX',
        material: 'Nhựa ABS + da tổng hợp',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800', is_primary: true, sort_order: 1 },
          { image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800', is_primary: false, sort_order: 2 }
        ],
        variants: [
          { sku: 'HEAD-SONY-BLK', size: 'One Size', color: 'Đen', color_hex: '#111111', price: 6990000, stock_quantity: 22 },
          { sku: 'HEAD-SONY-SLV', size: 'One Size', color: 'Bạc', color_hex: '#C0C0C0', price: 6990000, stock_quantity: 10 }
        ]
      },
      {
        id: 19,
        shop_id: 2,
        category_id: 4,
        name: 'Điện thoại Samsung Galaxy S24',
        slug: 'dien-thoai-samsung-galaxy-s24',
        description: 'Smartphone mạnh mẽ, camera AI và hiệu năng cao cho game, chụp ảnh và làm việc hàng ngày.',
        price: 20990000,
        sale_price: 18990000,
        sold_count: 62,
        view_count: 420,
        is_new: false,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Kính + khung nhôm',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'PHONE-SAM-8-256', size: '256GB', color: 'Xanh', color_hex: '#2B7A78', price: 18990000, stock_quantity: 20 },
          { sku: 'PHONE-SAM-8-512', size: '512GB', color: 'Đen', color_hex: '#000000', price: 20990000, stock_quantity: 15 }
        ]
      },
      {
        id: 20,
        shop_id: 1,
        category_id: 8,
        name: 'Nồi chiên không dầu Philips Airfryer',
        slug: 'noi-chien-khong-dau-philips-airfryer',
        description: 'Thiết bị nấu ăn tiện nghi, giảm dầu mỡ và giúp món ăn giòn đều, an toàn cho gia đình.',
        price: 6990000,
        sale_price: 5990000,
        sold_count: 33,
        view_count: 275,
        is_new: true,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Thép không gỉ',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1585518419759-7fe2e0fbf8a6?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'AIRFRY-XXL-BLK', size: '5.2L', color: 'Đen', color_hex: '#111111', price: 5990000, stock_quantity: 18 },
          { sku: 'AIRFRY-XXL-GRY', size: '5.2L', color: 'Xám', color_hex: '#808080', price: 5990000, stock_quantity: 12 }
        ]
      },
      {
        id: 21,
        shop_id: 2,
        category_id: 9,
        name: 'Máy lọc nước RO 6 cấp Sunhouse',
        slug: 'may-loc-nuoc-ro-6-cap-sunhouse',
        description: 'Hệ thống lọc nước hiện đại, loại bỏ cặn, vi khuẩn và mang lại nước uống sạch cho cả gia đình.',
        price: 5990000,
        sale_price: 4990000,
        sold_count: 17,
        view_count: 160,
        is_new: false,
        is_featured: false,
        gender: 'UNISEX',
        material: 'Thủy tinh + nhựa PP',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'RO-6-UV-BLK', size: 'Tủ đứng', color: 'Đen', color_hex: '#000000', price: 4990000, stock_quantity: 12 },
          { sku: 'RO-6-UV-WHT', size: 'Tủ đứng', color: 'Trắng', color_hex: '#F5F5F5', price: 4990000, stock_quantity: 20 }
        ]
      },
      {
        id: 22,
        shop_id: 1,
        category_id: 10,
        name: 'Máy giặt Samsung AI Inverter 9kg',
        slug: 'may-giat-samsung-ai-inverter-9kg',
        description: 'Máy giặt tiết kiệm điện, xả nước hiệu quả với công nghệ AI và nhiều chế độ giặt thông minh.',
        price: 11990000,
        sale_price: 10490000,
        sold_count: 85,
        view_count: 530,
        is_new: true,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Thép và nhựa cao cấp',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'WG-9K-BLK', size: '9kg', color: 'Đen', color_hex: '#101010', price: 10490000, stock_quantity: 45 },
          { sku: 'WG-9K-WHT', size: '9kg', color: 'Trắng', color_hex: '#F7F7F7', price: 10490000, stock_quantity: 30 }
        ]
      },
      {
        id: 23,
        shop_id: 1,
        category_id: 6,
        name: 'Đồng hồ thông minh Garmin Forerunner 255',
        slug: 'dong-ho-thong-minh-garmin-forerunner-255',
        description: 'Đồng hồ theo dõi sức khỏe, GPS chính xác, phù hợp cho tập luyện và theo dõi nhịp tim.',
        price: 8990000,
        sale_price: 7590000,
        sold_count: 42,
        view_count: 280,
        is_new: false,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Nhôm + kính cường lực',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'WATCH-GRM-BLK', size: '42mm', color: 'Đen', color_hex: '#111111', price: 7590000, stock_quantity: 25 },
          { sku: 'WATCH-GRM-SLV', size: '42mm', color: 'Bạc', color_hex: '#C7C7C7', price: 7590000, stock_quantity: 20 }
        ]
      },
      {
        id: 24,
        shop_id: 2,
        category_id: 13,
        name: 'Bàn phím cơ Keychron K8 Pro',
        slug: 'ban-phim-co-keychron-k8-pro',
        description: 'Bàn phím cơ gọn, switch tùy chọn và thiết kế tối ưu cho người dùng văn phòng và lập trình.',
        price: 4000000,
        sale_price: 3490000,
        sold_count: 19,
        view_count: 140,
        is_new: false,
        is_featured: false,
        gender: 'UNISEX',
        material: 'Nhôm + ABS',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'KB-K8-BLK', size: '75%', color: 'Đen', color_hex: '#000000', price: 3490000, stock_quantity: 20 },
          { sku: 'KB-K8-WHT', size: '75%', color: 'Trắng', color_hex: '#F5F5F5', price: 3490000, stock_quantity: 15 }
        ]
      },
      {
        id: 25,
        shop_id: 1,
        category_id: 11,
        name: 'Máy ảnh Sony Alpha 6400',
        slug: 'may-anh-sony-alpha-6400',
        description: 'Máy ảnh mirrorless nhỏ gọn, chụp ảnh sắc nét và quay video 4K chuyên nghiệp.',
        price: 21990000,
        sale_price: 19990000,
        sold_count: 52,
        view_count: 360,
        is_new: true,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Khung nhôm',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'CAM-SONY-6400', size: 'Body', color: 'Đen', color_hex: '#111111', price: 19990000, stock_quantity: 18 },
          { sku: 'CAM-SONY-6400-KIT', size: 'Kit 18-135', color: 'Đen', color_hex: '#111111', price: 24990000, stock_quantity: 22 }
        ]
      },
      {
        id: 26,
        shop_id: 2,
        category_id: 14,
        name: 'Máy xay sinh tố Philips ProBlend',
        slug: 'may-xay-sinh-to-philips-problend',
        description: 'Máy xay sinh tố mạnh mẽ, xử lý trái cây và thực phẩm lạnh nhanh chóng, dễ vệ sinh.',
        price: 2490000,
        sale_price: 2190000,
        sold_count: 38,
        view_count: 240,
        is_new: false,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Thép không gỉ',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'BLENDER-PHX-1L', size: '1.5L', color: 'Trắng', color_hex: '#FFFFFF', price: 2190000, stock_quantity: 20 },
          { sku: 'BLENDER-PHX-1L-BLK', size: '1.5L', color: 'Đen', color_hex: '#000000', price: 2190000, stock_quantity: 25 }
        ]
      },
      {
        id: 27,
        shop_id: 1,
        category_id: 12,
        name: 'Loa Bluetooth JBL Charge 5',
        slug: 'loa-bluetooth-jbl-charge-5',
        description: 'Loa di động âm bass mạnh, chống nước và pin bền cho tiệc tùng hoặc giải trí ngoài trời.',
        price: 4300000,
        sale_price: 3690000,
        sold_count: 73,
        view_count: 480,
        is_new: true,
        is_featured: false,
        gender: 'UNISEX',
        material: 'Nhựa ABS',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'SPEAKER-JBL-BLK', size: 'Standard', color: 'Đen', color_hex: '#000000', price: 3690000, stock_quantity: 35 },
          { sku: 'SPEAKER-JBL-BLU', size: 'Standard', color: 'Xanh', color_hex: '#2E8B57', price: 3690000, stock_quantity: 30 }
        ]
      },
      {
        id: 28,
        shop_id: 2,
        category_id: 4,
        name: 'Chuột Logitech MX Master 3S',
        slug: 'chuot-logitech-mx-master-3s',
        description: 'Chuột công thái học tối ưu cho văn phòng, khả năng kết nối đa thiết bị và thao tác mượt mà.',
        price: 3290000,
        sale_price: 2890000,
        sold_count: 29,
        view_count: 220,
        is_new: true,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Nhựa ABS + cao su',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1527814050087-3793815479db?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'MOUSE-MX-GRAY', size: 'Standard', color: 'Xám', color_hex: '#7A7A7A', price: 2890000, stock_quantity: 15 },
          { sku: 'MOUSE-MX-BLK', size: 'Standard', color: 'Đen', color_hex: '#111111', price: 2890000, stock_quantity: 15 }
        ]
      },
      {
        id: 29,
        shop_id: 2,
        category_id: 13,
        name: 'Ổ cắm thông minh Xiaomi Smart Plug',
        slug: 'o-cam-thong-minh-xiaomi-smart-plug',
        description: 'Ổ cắm điều khiển từ xa giúp quản lý thiết bị gia đình thông minh qua ứng dụng dễ dàng.',
        price: 620000,
        sale_price: 540000,
        sold_count: 67,
        view_count: 410,
        is_new: false,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Nhựa ABS',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1558002038-1055927dd3d9?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'SMART-PLUG-WHT', size: '220V', color: 'Trắng', color_hex: '#FFFFFF', price: 540000, stock_quantity: 20 },
          { sku: 'SMART-PLUG-BLK', size: '220V', color: 'Đen', color_hex: '#000000', price: 540000, stock_quantity: 25 }
        ]
      },
      {
        id: 30,
        shop_id: 1,
        category_id: 7,
        name: 'Bếp điện từ Bosch',
        slug: 'be-dien-tu-bosch',
        description: 'Bếp điện từ hiện đại, điều khiển cảm ứng dễ sử dụng và tiết kiệm năng lượng cho căn bếp.',
        price: 9900000,
        sale_price: 8690000,
        sold_count: 88,
        view_count: 510,
        is_new: true,
        is_featured: false,
        gender: 'UNISEX',
        material: 'Kính cường lực',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1585518419759-7fe2e0fbf8a6?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'COOKTOP-BOS-4', size: '4 vùng nấu', color: 'Đen', color_hex: '#111111', price: 8690000, stock_quantity: 40 },
          { sku: 'COOKTOP-BOS-5', size: '5 vùng nấu', color: 'Đen', color_hex: '#111111', price: 9390000, stock_quantity: 35 }
        ]
      },
      {
        id: 31,
        shop_id: 2,
        category_id: 9,
        name: 'Tủ lạnh Panasonic Inverter 400L',
        slug: 'tu-lanh-panasonic-inverter-400l',
        description: 'Tủ lạnh tiết kiệm điện, dung tích lớn và thiết kế hiện đại phù hợp cho gia đình 4-5 người.',
        price: 16990000,
        sale_price: 14990000,
        sold_count: 14,
        view_count: 180,
        is_new: false,
        is_featured: false,
        gender: 'UNISEX',
        material: 'Thép không gỉ',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1585518419759-7fe2e0fbf8a6?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'FRIDGE-PAN-400', size: '400L', color: 'Trắng', color_hex: '#F1F1F1', price: 14990000, stock_quantity: 12 },
          { sku: 'FRIDGE-PAN-400-BLK', size: '400L', color: 'Đen', color_hex: '#111111', price: 14990000, stock_quantity: 10 }
        ]
      },
      {
        id: 32,
        shop_id: 2,
        category_id: 8,
        name: 'Máy sấy tóc Panasonic Nanoe',
        slug: 'may-say-toc-panasonic-nanoe',
        description: 'Máy sấy tóc công suất mạnh, khô nhanh và bảo vệ tóc nhờ công nghệ ion và Nanoe.',
        price: 1590000,
        sale_price: 1290000,
        sold_count: 21,
        view_count: 190,
        is_new: true,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Nhựa ABS + kim loại',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'DRYER-PAN-BLK', size: 'Standard', color: 'Đen', color_hex: '#111111', price: 1290000, stock_quantity: 14 },
          { sku: 'DRYER-PAN-WHT', size: 'Standard', color: 'Trắng', color_hex: '#F7F7F7', price: 1290000, stock_quantity: 16 }
        ]
      },
      {
        id: 33,
        shop_id: 1,
        category_id: 5,
        name: 'Tai nghe không dây AirPods Pro 2',
        slug: 'tai-nghe-khong-day-airpods-pro-2',
        description: 'Tai nghe không dây với chống ồn, âm thanh sống động và trải nghiệm sử dụng cực thoải mái.',
        price: 5990000,
        sale_price: 4990000,
        sold_count: 94,
        view_count: 450,
        is_new: false,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Nhựa và silicon',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'AIRPODS-2-WHT', size: 'One Size', color: 'Trắng', color_hex: '#F7F7F7', price: 4990000, stock_quantity: 50 },
          { sku: 'AIRPODS-2-BLK', size: 'One Size', color: 'Đen', color_hex: '#000000', price: 4990000, stock_quantity: 45 }
        ]
      },
      {
        id: 34,
        shop_id: 2,
        category_id: 12,
        name: 'Camera giám sát WiFi Imou Cruiser 2',
        slug: 'camera-giam-sat-wifi-imou-cruiser-2',
        description: 'Camera quan sát ngoài trời, hình ảnh rõ nét, cảnh báo chuyển động và hỗ trợ giám sát từ xa.',
        price: 3290000,
        sale_price: 2790000,
        sold_count: 58,
        view_count: 270,
        is_new: true,
        is_featured: false,
        gender: 'UNISEX',
        material: 'Nhựa chịu nhiệt',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'CAM-IMOU-WHT', size: 'Outdoor', color: 'Trắng', color_hex: '#F7F7F7', price: 2790000, stock_quantity: 35 },
          { sku: 'CAM-IMOU-BLK', size: 'Outdoor', color: 'Đen', color_hex: '#000000', price: 2790000, stock_quantity: 40 }
        ]
      },
      {
        id: 35,
        shop_id: 1,
        category_id: 6,
        name: 'Đồng hồ thông minh Apple Watch SE',
        slug: 'dong-ho-thong-minh-apple-watch-se',
        description: 'Đồng hồ theo dõi hoạt động và nhịp tim, dùng tốt cho cá nhân và gia đình đang săn tìm công nghệ.',
        price: 7690000,
        sale_price: 6590000,
        sold_count: 110,
        view_count: 670,
        is_new: true,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Nhôm + kính Ion-X',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'WATCH-APP-GRY', size: '40mm', color: 'Xám', color_hex: '#8F8F8F', price: 6590000, stock_quantity: 40 },
          { sku: 'WATCH-APP-SLV', size: '40mm', color: 'Bạc', color_hex: '#D7D7D7', price: 6590000, stock_quantity: 35 }
        ]
      },
      {
        id: 36,
        shop_id: 1,
        category_id: 3,
        name: 'Laptop Dell XPS 13',
        slug: 'laptop-dell-xps-13',
        description: 'Laptop doanh nhân mỏng nhẹ, phù hợp làm việc di động và trình diễn hình ảnh chuyên nghiệp.',
        price: 25990000,
        sale_price: 22990000,
        sold_count: 65,
        view_count: 390,
        is_new: false,
        is_featured: true,
        gender: 'UNISEX',
        material: 'Nhôm CNC',
        approval_status: 'APPROVED',
        images: [
          { image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800', is_primary: true, sort_order: 1 }
        ],
        variants: [
          { sku: 'LAP-DEL-13-16', size: '13.4 inch', color: 'Bạc', color_hex: '#DADADA', price: 22990000, stock_quantity: 25 },
          { sku: 'LAP-DEL-13-32', size: '13.4 inch', color: 'Đen', color_hex: '#1E1E1E', price: 22990000, stock_quantity: 30 }
        ]
      }
    ];

    let imgId = 1;
    let varId = 1;

    for (const item of productsData) {
      const { images, variants, ...prodFields } = item;

      await db.Product.upsert({
        ...prodFields,
        created_at: new Date(),
        updated_at: new Date()
      });

      for (const img of images) {
        await db.ProductImage.upsert({
          id: imgId++,
          product_id: prodFields.id,
          image_url: img.image_url,
          is_primary: img.is_primary,
          sort_order: img.sort_order,
          alt_text: prodFields.name
        });
      }

      for (const v of variants) {
        await db.ProductVariant.upsert({
          id: varId++,
          product_id: prodFields.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          color_hex: v.color_hex,
          price: v.price,
          sale_price: prodFields.sale_price,
          stock_quantity: v.stock_quantity,
          is_active: true
        });
      }
    }

    const totalCount = await db.Product.count();
    console.log(`\nSuccessfully seeded 20 general e-commerce products. Total products now: ${totalCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed20Products();

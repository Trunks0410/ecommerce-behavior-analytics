import { test, expect } from '@playwright/test';

test.describe('UTEShop E2E Test Suite', () => {

  // Trước mỗi test case, tự động điều hướng về trang chủ
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC01: Trang chủ tải thành công và hiển thị đầy đủ thông tin chính', async ({ page }) => {
    // 1. Kiểm tra tiêu đề trang chứa chữ "UTEShop"
    await expect(page).toHaveTitle(/UTEShop/i);

    // 2. Kiểm tra xem Logo thương hiệu có hiển thị và chứa text "UTEShop" không
    const logo = page.locator('header a:has-text("UTEShop")');
    await expect(logo).toBeVisible();

    // 3. Kiểm tra xem nút "Khám phá ngay" trên Hero banner có hiển thị không
    const exploreBtn = page.getByRole('link', { name: /Khám phá ngay/i });
    await expect(exploreBtn).toBeVisible();

    // 4. Kiểm tra tiêu đề danh mục "HÀNG MỚI VỀ" có hiển thị
    const newArrivalsTitle = page.getByRole('heading', { name: /Hàng Mới Về/i });
    await expect(newArrivalsTitle).toBeVisible();
  });

  test('TC02: Đăng nhập thất bại khi nhập sai thông tin', async ({ page }) => {
    // 1. Click vào biểu tượng user trên Header để điều hướng đến trang Login
    // Dựa vào code Header.tsx: link chứa icon User dẫn tới /auth/login khi chưa đăng nhập
    const loginLink = page.locator('header a[href="/auth/login"]');
    await loginLink.click();

    // 2. Đảm bảo url đã chuyển hướng đến /auth/login
    await expect(page).toHaveURL(/\/auth\/login/);

    // 3. Kiểm tra tiêu đề biểu mẫu đăng nhập
    await expect(page.getByRole('heading', { name: 'Đăng nhập UTEShop' })).toBeVisible();

    // 4. Nhập email/phone không hợp lệ và mật khẩu
    await page.locator('#email_or_phone').fill('wronguser@gmail.com');
    await page.locator('#password').fill('wrongpassword123');

    // 5. Click nút Đăng nhập
    await page.getByRole('button', { name: /Đăng nhập/i }).click();

    // 6. Kiểm tra xem có hiển thị thông báo lỗi từ phía server / thunk trả về không
    // (Trong Login.tsx, thông báo lỗi hiển thị trong div khi biến error có giá trị)
    const errorAlert = page.locator('form').locator('xpath=./preceding-sibling::div[1]'); // Div lỗi nằm ngay trước form
    // Hoặc cách an toàn hơn: tìm div chứa class text-red-700
    const errorBox = page.locator('.text-red-700');
    await expect(errorBox).toBeVisible();
  });

  test('TC03: Đăng nhập thành công và chuyển hướng về trang chủ', async ({ page }) => {
    // 1. Vào trang đăng nhập
    await page.goto('/auth/login');

    // 2. Nhập thông tin tài khoản demo hợp lệ
    // LƯU Ý: Thay thế bằng tài khoản test thực tế của hệ thống bạn
    await page.locator('#email_or_phone').fill('testuser@gmail.com');
    await page.locator('#password').fill('12345678');

    // 3. Nhấn nút Đăng nhập
    await page.getByRole('button', { name: /Đăng nhập/i }).click();

    // 4. Sau khi đăng nhập thành công, hệ thống phải chuyển hướng về trang chủ
    await expect(page).toHaveURL('http://localhost:5173/');

    // 5. Kiểm tra biểu tượng User trên Header đã chuyển sang dạng Avatar người dùng (thẻ img)
    // (Trong Header.tsx: <Link to="/profile"> <img src=... /> </Link>)
    const avatarImg = page.locator('header a[href="/profile"] img');
    await expect(avatarImg).toBeVisible();
  });

  test('TC04: Thêm sản phẩm vào giỏ hàng thành công', async ({ page }) => {
    // 1. Nhấp vào nút "Khám phá ngay" hoặc trực tiếp vào trang /products
    await page.goto('/products');

    // 2. Đợi danh sách sản phẩm hiển thị và nhấp vào sản phẩm đầu tiên
    // Tìm các thẻ ProductCard (chứa link dẫn tới sản phẩm chi tiết /products/:id)
    const firstProduct = page.locator('a[href*="/products/"]').first();
    await expect(firstProduct).toBeVisible();
    
    // Lưu lại tên của sản phẩm để đối chiếu nếu cần
    const productName = await firstProduct.locator('h3').textContent();
    await firstProduct.click();

    // 3. Đang ở trang chi tiết sản phẩm. Tìm nút "Thêm vào giỏ hàng"
    const addToCartBtn = page.getByRole('button', { name: /Thêm vào giỏ/i });
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // 4. Kiểm tra Header cập nhật số lượng giỏ hàng lớn hơn 0
    // Trong Header.tsx: <span className="absolute ...">{itemCount}</span> nằm trong a[href="/cart"]
    const cartBadge = page.locator('header a[href="/cart"] span');
    await expect(cartBadge).toBeVisible();
    
    const countText = await cartBadge.textContent();
    const count = parseInt(countText || '0', 10);
    expect(count).toBeGreaterThan(0);
  });
});
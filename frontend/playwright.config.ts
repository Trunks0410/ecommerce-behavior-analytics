import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  /* Chạy các bài test song song để tiết kiệm thời gian */
  fullyParallel: true,
  /* Bỏ qua các test bị lỗi khi chạy ở môi trường CI */
  forbidOnly: !!process.env.CI,
  /* Thử lại nếu test bị lỗi (ở CI thử lại 2 lần, ở máy cá nhân không thử lại) */
  retries: process.env.CI ? 2 : 0,
  /* Số lượng worker chạy đồng thời */
  workers: process.env.CI ? 1 : undefined,
  /* Định dạng báo cáo xuất ra */
  reporter: 'html',
  
  /* Cấu hình chung cho các trình duyệt */
  use: {
    /* Base URL của server dev để không cần viết đầy đủ URL trong test */
    baseURL: 'http://localhost:5173',

    /* Tự động chụp ảnh màn hình khi test bị fail */
    screenshot: 'only-on-failure',
    
    /* Ghi lại video khi test bị fail */
    video: 'retain-on-failure',
    
    /* Thu thập trace (lịch sử chạy chi tiết) khi test bị fail */
    trace: 'retain-on-failure',
  },

  /* Cấu hình các trình duyệt kiểm thử */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Tự động chạy server frontend (Vite dev server) trước khi kiểm thử bắt đầu */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
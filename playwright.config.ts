import { defineConfig, devices } from '@playwright/test';

/**
 * E2Eテスト。ビルドした画面を vite preview で配信し、擬似API（MSW）ごと実際のブラウザで動かす。
 * サンプルデータは「今日」を基準に作られるため、テストでは時計と時間帯を固定して毎回同じデータにする。
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    trace: 'retain-on-failure',
    // ローカルで別のバージョンのブラウザを使うときだけ指定する（CIでは使わない）
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    // 依頼主がスマホでデモを開いても崩れないことを確かめる
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

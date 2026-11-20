import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 日付の計算をどの環境でも同じにするため、タイムゾーンを日本時間に固定する
    globalSetup: ['./test/global-setup.ts'],
  },
});

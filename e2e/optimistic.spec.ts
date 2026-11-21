import { expect, test } from '@playwright/test';

/** 今日の予約に「来店済みにする」ボタンが出るよう、開始時刻を過ぎた予約がある時刻に固定する */
const AFTERNOON = new Date('2026-11-25T15:00:00+09:00');

test.use({ locale: 'ja-JP', timezoneId: 'Asia/Tokyo' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AFTERNOON);
  await page.goto('./');
  await expect(page.getByText('今日の予約').first()).toBeVisible();
});

/** 開始時刻を過ぎた「予約」状態の今日の予約のうち、いちばん早いもの（画面の並びと同じ） */
async function firstStartedReservation(page: import('@playwright/test').Page) {
  return page.evaluate(async (now) => {
    const [bookings, customers] = await Promise.all([
      fetch('api/bookings').then((r) => r.json()),
      fetch('api/customers').then((r) => r.json()),
    ]);
    const today = new Date(now).toDateString();
    const b = (bookings as { id: string; customerId: string; start: string; status: string }[])
      .filter((x) => x.status === 'reserved' && new Date(x.start).toDateString() === today && new Date(x.start).getTime() <= now)
      .sort((a, z) => a.start.localeCompare(z.start))[0];
    const name = (customers as { id: string; name: string }[]).find((c) => c.id === b.customerId)?.name ?? '';
    return { id: b.id, name };
  }, AFTERNOON.getTime());
}

test('来店済みにすると、すぐに表示が変わり、サーバーにも保存される', async ({ page }) => {
  const target = await firstStartedReservation(page);
  const row = page.locator('ul.today li', { hasText: target.name }).first();
  await row.getByRole('button', { name: '来店済みにする' }).click();

  await expect(row.locator('.tag')).toHaveText('来店済み');
  await expect(row.getByRole('button', { name: '来店済みにする' })).toHaveCount(0);
  const saved = await page.evaluate(async (id) => {
    const list = (await fetch('api/bookings').then((r) => r.json())) as { id: string; status: string }[];
    return list.find((b) => b.id === id)?.status;
  }, target.id);
  expect(saved).toBe('visited');
});

test('サーバーで失敗したら、エラーを知らせて表示をサーバーの内容にそろえる', async ({ page }) => {
  const target = await firstStartedReservation(page);
  const row = page.locator('ul.today li', { hasText: target.name }).first();
  await expect(row).toBeVisible();

  // 画面に表示したまま、裏で別の人がこの予約を削除した状況をつくる
  await page.evaluate(async (id) => {
    await fetch(`api/bookings/${id}`, { method: 'DELETE', headers: { 'x-demo-role': 'admin' } });
  }, target.id);

  await row.getByRole('button', { name: '来店済みにする' }).click();

  await expect(page.getByRole('status').filter({ hasText: '来店済みにできませんでした。予約が見つかりません。' })).toBeVisible();
  // 失敗後にサーバーの内容で取り直すので、削除済みの予約は一覧から消える
  await expect(page.locator('ul.today li', { hasText: target.name })).toHaveCount(0);
});

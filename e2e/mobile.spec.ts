import { expect, test } from './fixtures.ts';

/** スマホ幅（Pixel 7）での表示。予約カレンダーと予約ダイアログが画面からはみ出さないこと */
test.describe('スマホでの表示', () => {
  test('予約カレンダーは横にスクロールでき、週末の列まで見られる', async ({ app }) => {
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    const scroller = app.locator('.calendar-scroll');
    const { scrollWidth, clientWidth } = await scroller.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);

    const sunday = app.locator('.dayhead').last();
    await expect(sunday).not.toBeInViewport();
    await scroller.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect(sunday).toBeInViewport();
  });

  test('予約ダイアログの入力欄が画面の幅に収まる', async ({ app }) => {
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    await app.getByRole('button', { name: '＋ 予約を登録' }).click();
    const dialog = app.getByRole('dialog', { name: '予約の編集' });
    const width = app.viewportSize()!.width;
    for (const name of ['staffId', 'menuId', 'start', 'status']) {
      const box = await dialog.locator(`[name="${name}"]`).boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.x + box!.width, name).toBeLessThanOrEqual(width);
    }
  });

  test('開始日時の初期値は30分単位', async ({ app }) => {
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    await app.getByRole('button', { name: '＋ 予約を登録' }).click();
    const value = await app.getByRole('dialog', { name: '予約の編集' }).locator('input[name="start"]').inputValue();
    expect(value).toMatch(/T\d{2}:(00|30)$/);
  });
});

test.describe('スマホでの顧客管理', () => {
  test('お客様を選ぶと、詳細まで移動する', async ({ app }) => {
    await app.getByRole('button', { name: '顧客管理' }).click();
    const target = app.locator('ul.rows button.row').nth(3);
    const name = (await target.locator('.name').innerText()).trim();
    await target.click();
    await expect(app.getByRole('heading', { name: `${name} 様` })).toBeInViewport();
  });
});
